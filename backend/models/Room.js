import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			index: true,
			uppercase: true,
			trim: true,
			minlength: 4,
			maxlength: 4,
		},
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 3600, // 1 hour TTL
		},
	},
	{
		versionKey: false,
	}
);

const Room = mongoose.model('Room', RoomSchema);
export default Room;


