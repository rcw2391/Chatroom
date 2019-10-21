import { Component, OnInit, ViewChild, ElementRef, HostListener, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { ChatSocket } from './chatSocket.model';
import { RoomService } from './room.service';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, AfterViewChecked {
  //Chat input field
  @ViewChild('chatInput', { static: false }) chatInput: ElementRef;
  //Chat feed container
  @ViewChild('chatContainer', { static: false }) chatContainer: ElementRef;

  //Check for mobile device
  mobileList = false;
  innerWidth = 0;
  isMobileListOpen = false;

  //Measure the width of the window
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerWidth = window.innerWidth;
    if (this.innerWidth < 768) {
      this.mobileList = true;
    } else {
      this.mobileList = false;
    }
  }

  constructor(private http: HttpClient, private authService: AuthService, private roomService: RoomService) { }

  //Messages to display in currently selected room
  messages: { userName: string, message: string }[] = [];
  //Users to display in currently selected room
  userList: string[] = [];
  //Currently selected room
  selectedRoom: string = '/public';
  //Store of all messages and users
  messageStore: { room: string, messages: { userName: string, message: string }[], users: string[] }[] = this.roomService.messageStore;
  userName: string = '';
  //Unique userId assigned by back-end.
  userId = '';
  //Error handling
  isError = false;
  errorMessage = '';
  isChatError = false;
  chatErrorMessage = '';
  isChatSpam = false;


  ngOnInit() {
    //Reference messageStore to service store
    this.messageStore = this.roomService.messageStore;
    //Get user credentials from auth service
    this.userId = this.authService.userId;
    this.userName = this.authService.userName;
    //Join the default public room
    this.roomService.joinRoom('/public', '', this.userId);
    //Get room that is selected by user, and change feeds
    this.roomService.selectedRoom.subscribe(room => {
      this.selectedRoom = room;
      const index = this.roomService.messageStore.findIndex(messages => {
        return messages.room === room;
      });
      if(this.selectedRoom !== 'none') {
        this.messages = this.roomService.messageStore[index].messages;
        this.userList = this.roomService.messageStore[index].users;
      } else {
        this.userList = [];
        this.messages = [];
      }     
    });
    // Subscribe to socket channels when a new room is created or joined
    this.roomService.newRoomCreated.subscribe((chatSocket: ChatSocket) => {
     chatSocket.socket.on('messages', (data: { user: string, message: string }) => {
        this.addMessage(data.message, data.user, chatSocket.name);
      });
      chatSocket.socket.on('userJoin', (data: {user: string, message: string}) => {
        this.addMessage(data.message + ' has joined the channel.', data.user, chatSocket.name);
        this.addUser(data.message, chatSocket.name);
      });
      chatSocket.socket.on('userList', (data: {users: string[], message: string, user: string}) => {
        const roomIndex = this.findRoomIndex(chatSocket.name);
        this.roomService.messageStore[roomIndex].users = data.users;
        if(this.selectedRoom === chatSocket.name) {
          this.userList = this.roomService.messageStore[roomIndex].users;
          this.addMessage(data.message + ' has left the channel.', data.user, chatSocket.name);
        }
      });
      chatSocket.socket.on('spam', (data: { message: string }) => {
        this.isChatSpam = true;
        this.chatErrorMessage = data.message;
        setTimeout(() => {
          this.isChatSpam = false;
        }, 10000);
      });
    });
    this.roomService.leftRoom.subscribe((socket: ChatSocket) => {
      socket.socket.close();
    });
  }

  ngAfterViewChecked() {
    // Auto scroll chat feed
    this.updateScroll();
  }
  //Fired after clicking send in chat input
  onSend() {
    this.isChatError = false;
    const message = this.chatInput.nativeElement.value;
    if (message.length > 140) {
      this.isChatError = true;
      this.chatErrorMessage = 'Message must be less than 140 characters.'
      return;
    }
    this.http.post('http://localhost:3000/sendMessage', { userId: this.userId, message: message, room: this.selectedRoom })
      .subscribe(responseData => {
        console.log(responseData);
        this.updateScroll();
      }, error => {
        this.isChatError = true;
        this.chatErrorMessage = error.error.message;
        return;
      });
    this.chatInput.nativeElement.value = '';
  }
  // Fired when a message is received from socket
  addMessage(message: string, userName: string, room: string) {
    const index = this.findRoomIndex(room);
    if(index !== -1) {
      this.roomService.messageStore[index].messages.push({userName: userName, message: message});
    }
    if(this.roomService.messageStore[index].messages.length > 100) {
      this.roomService.messageStore[index].messages.shift();
    }
  }

  //Find a room index in the store
  findRoomIndex(room: string) {
    const index = this.roomService.messageStore.findIndex(item => {
      return item.room === room;
    });
    return index;
  }
  // Fired to keep chat feed scrolled to bottom of the page
  updateScroll() {
    if (this.chatContainer.nativeElement.scrollHeight) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
  //Send messages by pressing Enter
  onChatInputKeyPress(event: KeyboardEvent) {
    if (!this.isChatSpam) {
      if (event.key === 'Enter') {
        this.onSend();
      }
    }
  }
  //Fired when a user enters a room
  addUser(user: string, room: string) {
    const index = this.findRoomIndex(room);
    if(index !== -1){
      this.roomService.messageStore[index].users.push(user);
    }
  }
  //Fired when a user leaves a room
  removeUser(name) {
    const index = this.userList.findIndex(user => {
      return user === name;
    });
    if (index >= 0) {
      this.userList.splice(index, 1);
    }
  }
  //Mobile user list actions
  onOpenMobileUserList() {
    this.isMobileListOpen = true;
  }

  onCloseMobileUserList() {
    this.isMobileListOpen = false;
  }

  onOpenMobileRoomList() {
    this.roomService.openMobileRoomList.emit(true);
  }
  //Fired when a  room is left
  onLeaveRoom() {
    this.roomService.leaveRoom(this.selectedRoom, this.userId);
  }
}