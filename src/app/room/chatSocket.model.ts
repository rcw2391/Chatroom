import io from 'socket.io-client';

export class ChatSocket {
    
    name: string;
    password: string;
    socket: io;
    messageStore: { room: string, messages: { userName: string, message: string }[], users: string[] }[];
    
    //Create a new ChatSocket object for storing socket namespaces
    constructor(
            name: string, 
            password: string, 
            messageStore: { room: string, messages: { userName: string, message: string }[], users: string[] }[]) {
                this.name = name;
                this.password = password;
                this.messageStore = messageStore;
                this.socket = io('http://localhost:3000' + this.name);
            }

    getSocket() {
        return this.socket;
    }
}