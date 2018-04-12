import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { empty } from 'rxjs/observable/empty';
import { bingSpeech } from 'cognitive-services';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
    selector: 'app-call',
    templateUrl: './call.component.html',
    styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit, AfterViewInit {

    @ViewChild('wave') canvas;

    private analyser: AnalyserNode;
    private sentences = new Subject<string>();
    public words: Observable<string[]>;

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit() {

        this.words = this.sentences.asObservable().scan((current, word) => [word, ...current], []);
    }


    ngAfterViewInit() {
        /**
         * We need canvas to be settled down
         */
        this.prepareVisualizer(this.analyser);

    }

    sendSound(call, path) {
        return this.http.get(path, {
            responseType: 'blob'
        }).subscribe(data => call.getCallOptions().sendAudioBlob(data));
    }



    private prepareVisualizer(analyser: AnalyserNode) {
    if (!this.canvas || !this.canvas.nativeElement) {
        return;
    }
    const canvas = this.canvas.nativeElement;
    const canvasCtx = canvas.getContext('2d');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    let drawVisual;

    return new Promise((resolve, reject) => {

        analyser.fftSize = 2048;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        const draw = function () {

            drawVisual = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = 'rgb(250, 250, 250)';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

            canvasCtx.beginPath();

            const sliceWidth = WIDTH * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {

                const v = dataArray[i] / 128.0;
                const y = v * (HEIGHT / 2);

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };

        draw();


    });

}


}
