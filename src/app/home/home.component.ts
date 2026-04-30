import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_URL = 'http://localhost:4000/api';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  roomCode: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  async createRoom() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const response: any = await firstValueFrom(this.http.post(`${API_URL}/room`, {}));
      if (response?.code) {
        this.router.navigate(['/room', response.code]);
      } else {
        this.errorMessage = 'Failed to create room. Please try again.';
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error creating room:', error);
      this.errorMessage = 'Failed to create room. Please try again.';
      this.isLoading = false;
    }
  }

  async joinRoom() {
    if (!this.roomCode.trim()) {
      return;
    }

    const code = this.roomCode.trim().toUpperCase();
    if (code.length !== 4) {
      this.errorMessage = 'Room code must be 4 characters';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response: any = await firstValueFrom(this.http.get(`${API_URL}/rooms/${code}`));
      if (response?.exists) {
        this.router.navigate(['/room', code]);
      } else {
        this.errorMessage = 'Room does not exist. Please check the code.';
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error checking room:', error);
      this.errorMessage = 'Room does not exist. Please check the code.';
      this.isLoading = false;
    }
  }
}
