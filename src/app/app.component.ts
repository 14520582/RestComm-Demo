import 'rxjs/add/observable/of';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/scan';

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Router } from '@angular/router';

import { ConnectionStatus } from './core/core-utils';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {

    public connectionStatus: Observable<ConnectionStatus>;
    private alive = false;

    constructor(

        private router: Router
    ) {
    }

    public ngOnInit(): void {
        this.alive = true;

        // this.connectionStatus = this._generateConnectionStatusFeed();

    }
    convertUint8ArrayToBinaryString(u8Array) {
        let i, b_str = '';
        const len = u8Array.length;
        for (i = 0; i < len; i++) {
            b_str += String.fromCharCode(u8Array[i]);
        }
        return b_str;
    }

    // private _generateConnectionStatusFeed(): Observable<ConnectionStatus> {

    //     return this.UA.notifier

    //         .filter(
    //         (message: UAMessage) => ['registered', 'disconnected'].indexOf(message.event) !== -1
    //         )
    //         .map((message: UAMessage) => {

    //             const status: ConnectionStatus = {
    //                 who: 'not registered',
    //                 last: new Date()
    //             };
    //             if (message.event === 'registered') {
    //                 const messageData = <UAregisteredData>message.data;
    //                 status.who = messageData.response['from']['uri']['user'];
    //             }
    //             return status;
    //         })

    //         .scan((acc, cur) => {
    //             return { ...acc, ...cur };
    //         });
    // }

    public ngOnDestroy() {
        this.alive = false;
    }
}
