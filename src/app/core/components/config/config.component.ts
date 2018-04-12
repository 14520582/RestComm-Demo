
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import 'rxjs/add/operator/takeWhile';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
// import { Device } from '../../../restcomm/RestCommWebClient'
@Component({
    selector: 'app-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigComponent implements OnInit, OnDestroy {
    hidePassword: true;
    configForm: FormGroup;
    alive: boolean;
    mustPersist = false;
    savingInterval = null;
    parameters = {
        'debug': true,
        'username': '1007',
        'password': '1234',
        // If you want to register to a local Restcomm Connect instance running at localhost and you want to use unencrypted signaling you need to provide those as well and use a provisioned client as a name (like bob or alice)
        'registrar': 'wss://vietvan.net:7443',
        'domain': 'vietvan.net',
    };
    // device = new Device()
    constructor(
        private fb: FormBuilder,
    ) {

    }

    ngOnInit() {
        this.alive = true;
        this.configForm = this.fb.group({
            wsuri: '',
            sipuri: '',
            password: '',
            autosave: '',
            autoconnect: '',
            stuns: '',
            // azurekeys: this.configuration.azurekeys
        });

        // Avoid disabling flicking

        this._monitorAutosave();
        this._monitorChanges();
        this._monitorStatus();

    }

    ngOnDestroy() {
        this.alive = false;
    }

    private _monitorChanges() {
        this.configForm.valueChanges
            .takeWhile(() => this.alive)
            .subscribe((value) => {

                Object.keys(value).map(key => {

                });

                if (this.configForm.controls.autosave.value) {

                } else {

                }
            });
    }

    private _monitorAutosave() {
        const autoSave = this.configForm.controls.autosave;
        autoSave.valueChanges
            .takeWhile(() => this.alive)
            .subscribe((value) => {
                if (value) {
                    this.configForm.controls.autoconnect.enable();
                } else {
                    this.configForm.controls.autoconnect.disable();

                }
            });
    }

    private _monitorStatus() {

    }

    private connect() {
        // let parameters = {
		// 	'debug': true,
		// 	'username': '1007',
		// 	'password': '1234',
		// 	'registrar': 'wss://vietvan.net:7443',
		// 	'domain': 'vietvan.net',
        // }
        // this.device.setup(parameters)
    }
}
