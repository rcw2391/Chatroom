import { EventEmitter, Injectable } from '@angular/core';
import { ChatSocket } from './chatSocket.model';
import { HttpClient } from '@angular/common/http';

@Injectable({providedIn: 'root'})
export class RoomService {
    //Events used for error handling
    isChatError = new EventEmitter<boolean>();
    chatErrorMessage = new EventEmitter<string>();
    selectedRoom = new EventEmitter<string>();

    //Events used for joining,creating, and leaving rooms
    newRoomCreated = new EventEmitter<ChatSocket>();
    newRoomJoined = new EventEmitter<string>();

    leftRoom = new EventEmitter<ChatSocket>();
    leftRoomName = new EventEmitter<string>();

    //Event used for opening room list on mobile devices
    openMobileRoomList = new EventEmitter<boolean>();

    //Event used for triggering an error when creating or joining a room
    throwNewRoomError = new EventEmitter<{isError: boolean, newRoomErrorMessage: string}>();

    constructor(private http: HttpClient) {}

    //Store used for holding all messages and users
    public messageStore: { room: string, messages: { userName: string, message: string }[], users: string[] }[] = [];

    //Store used for holding all chatSockets and associating them with a room name.
    public socketStore: { room: string, socket: ChatSocket }[] = [];

    //Fired when creating a new room.
    newRoom(name: string, password: string, userId: string) {
        this.http.post<{message: string, users: string[]}>('http://localhost:3000/createNewRoom', 
        {room: name, password: password, userId: userId}).subscribe(response => {
            const socket = new ChatSocket(name, password, this.messageStore);
            this.socketStore.push({ room: name, socket: socket });
            this.messageStore.push({ room: name, messages: [], users: response.users });
            this.newRoomCreated.emit(socket);
            this.newRoomJoined.emit(name);
            this.selectedRoom.emit(name);
        }, err => {
            this.throwNewRoomError.emit({ isError: true, newRoomErrorMessage: err.error.message });
        });        
    }

    //Fired when joining an existing room.
    joinRoom(name: string, password: string, userId: string) {
        this.http.post<{message: string, users: string[]}>('http://localhost:3000/joinRoom', 
        {room: name, password: password, userId: userId})
            .subscribe(response => {
                const socket = new ChatSocket(name, password, this.messageStore);
                this.socketStore.push({ room: name, socket: socket });
                this.messageStore.push({ room: name, messages: [], users: response.users });
                this.newRoomCreated.emit(socket);
                this.newRoomJoined.emit(name);
                this.selectedRoom.emit(name);
            }, err => {
                this.throwNewRoomError.emit({isError: true, newRoomErrorMessage: err.error.message});
        });
    }

    //Fired when leaving a room
    leaveRoom(name: string, userId: string) {
        this.http.post('http://localhost:3000/leaveRoom', {room: name, id: userId})
        .subscribe(result => {
            this.messageStore.splice(this.findRoomIndexByName(name, this.messageStore), 1);
            this.leftRoom.emit(this.socketStore[this.findRoomIndexByName(name, this.socketStore)].socket);
            this.socketStore.splice(this.findRoomIndexByName(name, this.socketStore), 1);
            this.leftRoomName.emit(name);
        }, err => {
            console.log(err);
        });
    }

    //Find the index of a room in the message or socket store
    findRoomIndexByName(name: string, store: any[]) {
        const index = store.findIndex((item: {room: string}) => {
            return item.room === name;
        });
        return index;
    }
}