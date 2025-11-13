import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: 'sent' | 'received';
  sender?: string;
  isFile?: boolean;
  fileName?: string;
  fileData?: string;
  mimeType?: string;
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  roomCode: string = '';
  messageText: string = '';
  messages: Message[] = [];
  showUploadModal: boolean = false;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;
  copiedToClipboard: boolean = false;
  isValidating: boolean = true;
  roomExists: boolean = false;
  isEndingRoom: boolean = false;
  private shouldScrollToBottom: boolean = false;
  private socket!: Socket;
  private messageIdCounter: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    this.roomCode = this.route.snapshot.paramMap.get('code')?.toUpperCase() || '';
    
    if (!this.roomCode || this.roomCode.length !== 4) {
      this.router.navigate(['/']);
      return;
    }

    // Validate room exists
    await this.validateRoom();
    
    if (!this.roomExists) {
      return;
    }

    // Connect to Socket.IO
    this.connectSocket();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private async validateRoom() {
    this.isValidating = true;
    try {
      const response: any = await firstValueFrom(this.http.get(`${API_URL}/rooms/${this.roomCode}`));
      this.roomExists = response?.exists === true;
      if (!this.roomExists) {
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      }
    } catch (error) {
      console.error('Error validating room:', error);
      this.roomExists = false;
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } finally {
      this.isValidating = false;
    }
  }

  private connectSocket() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 60000, // 60 seconds timeout
      forceNew: false
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      // Always join room on connect (including reconnects)
      this.socket.emit('join-room', this.roomCode);
    });

    this.socket.on('reconnect', () => {
      console.log('Reconnected to server, rejoining room');
      this.socket.emit('join-room', this.roomCode);
    });

    // If socket is already connected, join room immediately
    if (this.socket.connected) {
      console.log('Socket already connected, joining room');
      this.socket.emit('join-room', this.roomCode);
    }

    this.socket.on('receive-message', (data: { message: string; sender: string; timestamp: number }) => {
      this.messages.push({
        id: `msg-${Date.now()}-${this.messageIdCounter++}`,
        text: data.message,
        timestamp: new Date(data.timestamp),
        type: 'received',
        sender: data.sender
      });
      this.shouldScrollToBottom = true;
    });

    this.socket.on('receive-file', (data: { fileName: string; mimeType: string; data: string; timestamp: number }) => {
      console.log('Received file via socket:', data.fileName);
      this.messages.push({
        id: `file-${Date.now()}-${this.messageIdCounter++}`,
        text: data.fileName,
        timestamp: new Date(data.timestamp),
        type: 'received',
        isFile: true,
        fileName: data.fileName,
        fileData: data.data,
        mimeType: data.mimeType
      });
      this.shouldScrollToBottom = true;
    });

    this.socket.on('room-ended', () => {
      alert('Room has been ended by the creator.');
      this.router.navigate(['/']);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'transport close' || reason === 'ping timeout') {
        console.log('Connection lost, attempting to reconnect...');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  sendMessage() {
    if (this.messageText.trim() && this.socket) {
      const message: Message = {
        id: `msg-${Date.now()}-${this.messageIdCounter++}`,
        text: this.messageText,
        timestamp: new Date(),
        type: 'sent'
      };
      this.messages.push(message);
      this.shouldScrollToBottom = true;

      this.socket.emit('send-message', {
        roomCode: this.roomCode,
        message: this.messageText,
        sender: 'You'
      });

      this.messageText = '';
    }
  }

  openFileUpload() {
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadProgress = 0;
    this.uploadSuccess = false;
    this.isUploading = false;
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  uploadFile(file: File) {
    // Check file size (50MB limit, accounting for base64 encoding overhead)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      alert(`File is too large. Maximum file size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      this.closeUploadModal();
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Error reading file. Please try again.');
      this.closeUploadModal();
    };
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      const base64Data = fileData.split(',')[1] || fileData;
      
      // Check base64 size (should be ~33% larger than original)
      const base64Size = base64Data.length * 0.75; // Approximate original size
      if (base64Size > 50 * 1024 * 1024) {
        alert(`File is too large after encoding. Maximum file size is 50MB.`);
        this.closeUploadModal();
        return;
      }

      // Simulate upload progress
      const interval = setInterval(() => {
        this.uploadProgress += 10;
        if (this.uploadProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            this.uploadSuccess = true;
            this.isUploading = false;

            // Add to messages
            const message: Message = {
              id: `file-${Date.now()}-${this.messageIdCounter++}`,
              text: file.name,
              timestamp: new Date(),
              type: 'sent',
              isFile: true,
              fileName: file.name,
              fileData: base64Data,
              mimeType: file.type
            };
            this.messages.push(message);
            this.shouldScrollToBottom = true;

            // Send via socket - wait a bit to ensure connection is stable
            const sendFile = () => {
              if (!this.socket || !this.socket.connected) {
                console.error('Socket not connected, cannot send file');
                alert('Not connected to server. Please wait and try again.');
                this.closeUploadModal();
                return;
              }

              console.log('Sending file via socket:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'to room:', this.roomCode);
              console.log('Base64 data length:', base64Data.length, 'characters');
              
              // Double-check connection right before sending
              if (!this.socket.connected) {
                console.error('Socket disconnected before sending file');
                alert('Connection lost. Please try again.');
                this.closeUploadModal();
                return;
              }

              try {
                // Use a callback to verify the message was sent
                const timeout = setTimeout(() => {
                  console.warn('File send timeout - no response from server');
                }, 30000); // 30 second timeout

                this.socket.emit('send-file', {
                  roomCode: this.roomCode,
                  fileName: file.name,
                  mimeType: file.type,
                  data: base64Data
                }, (response: any) => {
                  clearTimeout(timeout);
                  if (response && response.error) {
                    console.error('Server error sending file:', response.error);
                    alert('Failed to send file: ' + response.error);
                  } else {
                    console.log('File sent successfully, response:', response);
                  }
                });

                // Monitor connection after sending
                const checkInterval = setInterval(() => {
                  if (!this.socket.connected) {
                    console.warn('Socket disconnected after sending file');
                    clearInterval(checkInterval);
                  }
                }, 500);

                // Clear interval after 5 seconds
                setTimeout(() => clearInterval(checkInterval), 5000);
              } catch (error) {
                console.error('Error sending file via socket:', error);
                alert('Failed to send file. It may be too large.');
                this.closeUploadModal();
              }
            };

            // Wait a moment to ensure socket is fully ready
            if (this.socket.connected) {
              // Small delay to ensure connection is stable
              setTimeout(sendFile, 100);
            } else {
              // Wait for connection
              const checkConnection = setInterval(() => {
                if (this.socket.connected) {
                  clearInterval(checkConnection);
                  setTimeout(sendFile, 100);
                }
              }, 100);
              
              // Timeout after 5 seconds
              setTimeout(() => {
                clearInterval(checkConnection);
                if (!this.socket.connected) {
                  alert('Could not connect to server. Please try again.');
                  this.closeUploadModal();
                }
              }, 5000);
            }

            setTimeout(() => {
              this.closeUploadModal();
            }, 1500);
          }, 300);
        }
      }, 150);
    };

    reader.readAsDataURL(file);
  }

  copyRoomCode() {
    navigator.clipboard.writeText(this.roomCode);
    this.copiedToClipboard = true;
    setTimeout(() => {
      this.copiedToClipboard = false;
    }, 2000);
  }

  async endRoom() {
    if (!confirm('Are you sure you want to end this room? All participants will be disconnected.')) {
      return;
    }

    this.isEndingRoom = true;
    try {
      await firstValueFrom(this.http.delete(`${API_URL}/rooms/${this.roomCode}`));
      
      // Notify other users via socket
      if (this.socket) {
        this.socket.emit('end-room', this.roomCode);
        this.socket.disconnect();
      }

      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error ending room:', error);
      alert('Failed to end room. Please try again.');
    } finally {
      this.isEndingRoom = false;
    }
  }

  downloadFile(message: Message) {
    if (!message.fileData || !message.fileName) return;

    try {
      const byteCharacters = atob(message.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: message.mimeType || 'application/octet-stream' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) {}
  }
}
