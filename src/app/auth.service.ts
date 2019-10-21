import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class AuthService {

    userName = '';
    userId = '';

    constructor(private http: HttpClient){}

    checkName(id: string, userName: string, room: string) {
        return this.http.post<{ action: string, userName: string }>('http://localhost:3000/checkName', 
        { id: id, userName: userName, room: room });
    }

    getUserId() {
        return this.userId;
    }
}