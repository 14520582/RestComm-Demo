import { Component, Input, OnInit } from '@angular/core';


@Component({
    selector: 'app-call-brief',
    templateUrl: './call-brief.component.html',
    styleUrls: ['./call-brief.component.scss']
})
export class CallBriefComponent implements OnInit {
    @Input() call: any;
    @Input() source: string;
    constructor(
    ) { }

    ngOnInit() {
    }

}
