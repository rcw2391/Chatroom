import { Component, OnInit, ViewChild, ElementRef, HostListener} from '@angular/core';
import io from 'socket.io-client';
import { AuthService } from './auth.service';
import { RoomService } from './room/room.service';
import { stringify } from 'querystring';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  //Username input field
  @ViewChild('userNameInput', { static: false }) userNameInput: ElementRef;
  //New/Join room input fields
  @ViewChild('roomNameInput', {static: false}) roomNameInput: ElementRef;
  @ViewChild('roomPasswordInput', {static: false}) roomPasswordInput: ElementRef;
  //List of rooms
  @ViewChild('roomList', {static: false}) roomList: ElementRef;

  constructor(private authService: AuthService, private roomService: RoomService) {}

  title = 'Chatroom';
  //Error handling
  isError = false;
  errorMessage = '';
  //User information
  userId = '';
  userName = '';
  //Array holding list of rooms
  rooms = [[]];
  //Array for mobile display
  mobileRooms = [];
  //Booleans for managing new room window
  isAddNewRoom = false;
  isJoin = false;
  //Used for managing highlighting on selected room
  previouslySelectedRoom = '/public';
  selectedRoomInit = false;
  //Currently selected room
  selectedRoom = '/public';
  //Used for managing new room window
  isLeaveRoom = false;
  //Used for managing list of rooms in header
  roomsOverFlow = false;
  offBar: string[] = [];
  roomWidth: number = 0;
  currentPage = 0;
  maxPage = 0;
  pageRemoved = 0;

  //Used for mobile display
  mobileDisplay = false;
  isMobileRoomsOpen = false;
  innerWidth = 0;
  isNewRoomError = false;
  newRoomErrorMessage = '';

  //Detecting window size
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerWidth = window.innerWidth;
    if (this.innerWidth < 768) {
      this.mobileDisplay = true;
    } else {
      this.mobileDisplay = false;
    }
  }

  ngOnInit() {
    //Create socket
    const socket = io('http://localhost:3000');
    socket.on('userId', (data: {id: string}) => {
      this.userId = data.id;
    });
    //Fires when a new room is joined or created
    this.roomService.newRoomJoined.subscribe((newRoom: string) => {
      this.addRoom(newRoom);
      this.onSelectRoom(newRoom);
      this.isNewRoomError = false;
      this.newRoomErrorMessage = '';
      this.onCloseNewRoom();
    });
    //Fires when a room is left
    this.roomService.leftRoomName.subscribe((name: string) => {
      if(!this.mobileDisplay) {
        let index = this.rooms.findIndex(room => {
          return room[this.currentPage] === name;
        });
        this.rooms[this.currentPage].splice(index, 1);
        this.pageRemoved = this.currentPage;
        if (this.rooms.length !== 0) {
          this.onSelectRoom(this.rooms[0][0]);
        } else {
          this.onSelectRoom('none');
        }
        this.checkRooms();
      } else {
        let mobileIndex = this.mobileRooms.findIndex(room => {
          return room === name;
        });
        this.mobileRooms.splice(mobileIndex, 1);
      }
    });
    //Fires when the room list is opened in mobile
    this.roomService.openMobileRoomList.subscribe(isOpen => {
      this.isMobileRoomsOpen = isOpen;
    });
    //Fires when an error is received when attempting to join or create a new room
    this.roomService.throwNewRoomError.subscribe((result: {isError: boolean, newRoomErrorMessage: string}) => {
      this.isNewRoomError = result.isError;
      this.newRoomErrorMessage = result.newRoomErrorMessage;
    });
  }
  //Fired when a name is entered
  onChangeName() {
    const regex = /[^\w\s]/;
    const userName = this.userNameInput.nativeElement.value.trim();
    if (userName.length > 20) {
      this.isError = true;
      this.errorMessage = 'Username must be less than 20 characters.'
    }
    if (regex.test(userName)){
      this.isError = true;
      this.errorMessage = 'Username must be alphanumeric!';
      return;
    }
    if (userName.length < 1) {
      this.isError = true;
      this.errorMessage = 'Please enter a username.';
      return;
    }
    this.isError = false;
    this.authService.checkName(this.userId, userName, '/public')
    .subscribe(responseData => {
      this.userNameInput.nativeElement.value = '';
      this.authService.userName = responseData.userName;
      this.authService.userId = this.userId;
      this.userName = responseData.userName;
    }, error => {
      this.errorMessage = error.error.message;
      this.isError = true;
      return;
    });
  }
  //Enter to submit username
  onNameInputKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onChangeName();
    }
  }
  //Toggle new room window
  onAddNewRoom() {
    this.isAddNewRoom = true;
  }
  //Toggle leave room prompt
  onLeaveRoom() {
    this.isLeaveRoom = true;
  }
  //Leave room options
  onYesLeaveRoom() {
    this.roomService.leaveRoom(this.selectedRoom, this.userId);
    this.isLeaveRoom = false;
  }

  onNoLeaveRoom() {
    this.isLeaveRoom = false;
  }
  //Fired when the create room button is pressed
  onCreateNewRoom() {
    const name = '/' + this.roomNameInput.nativeElement.value;
    const password = this.roomPasswordInput.nativeElement.value;
    this.roomService.newRoom(name, password, this.userId);
    this.selectedRoomInit = true;
  }
  //Toggle new room window
  onCloseNewRoom() {
    this.isAddNewRoom = false;
  }
  //Fired when a room is selected in header
  onSelectRoom(room: string) {
    this.roomService.selectedRoom.emit(room);
    this.selectedRoom = room;
  }
  //Toggle for new room window
  onToggleJoinCreate() {
    this.isJoin = !this.isJoin;
  }
  //Fired when join room is pressed
  onJoinRoom() {
    const name = '/' + this.roomNameInput.nativeElement.value;
    const password = this.roomPasswordInput.nativeElement.value;
    this.roomService.joinRoom(name, password, this.userId);
  }
  //Toggle room list
  onShiftRoomsLeft() {
   if(this.maxPage !== 0) {
      if (this.currentPage === 0) {
        this.currentPage = this.maxPage;
      } else {
        this.currentPage -= 1;
      } 
    }   
  }
  //Toggle room list
  onShiftRoomsRight() {
    if(this.maxPage !== 0){
      if (this.currentPage === this.maxPage) {
        this.currentPage = 0;
      } else {
        this.currentPage += 1;
      }
    }
  }
  //Fired when a new room is added.
  addRoom(room: string) {
    this.mobileRooms.push(room);
    if(!this.mobileDisplay) {
      this.currentPage = this.maxPage;
      this.rooms[this.currentPage].push(room);
      setTimeout(() => {
        let width = this.roomList.nativeElement.offsetWidth;
        console.log(width);
        if (width >= 755) {
          this.rooms.push([this.rooms[this.currentPage].pop()]);
          this.maxPage += 1;
          this.currentPage = this.maxPage;
        }
      });
      console.log(this.rooms);
    }
  }
  //Room 'pagination'
  checkRooms() {
    if(this.pageRemoved !== this.maxPage){
      this.rooms[this.pageRemoved].push(this.rooms[this.pageRemoved+1].shift());
      setTimeout( () => {
        let width = this.roomList.nativeElement.offsetWidth;
        if(width >= 755) {
          this.rooms[this.pageRemoved+1].unshift(this.rooms[this.pageRemoved].pop());
        } else {
          if(this.rooms[this.maxPage].length === 0){
            this.maxPage -= 1;
          } else {
            this.currentPage, this.pageRemoved += 1;
            this.checkRooms();
          }          
        }
      });
    }
    this.currentPage = 0;
  }
  //Fired when mobile room list is closed
  onCloseMobileRoomsList() {
    this.isMobileRoomsOpen = false;
  }
}