import {Component, Inject, OnInit} from '@angular/core';
import { AppGlobalService } from '../../services/app-global-service.service';
import { FormAndFrameworkUtilService } from '../../services/formandframeworkutil.service';
import {
    InteractSubtype,
    InteractType,
} from '../../services/telemetry-constants';
import { AppHeaderService } from '../../services/app-header.service';
import { CommonUtilService } from '../../services/common-util.service';
import {
    WebviewStateSessionProviderConfig,
    WebviewRegisterSessionProviderConfig,
    WebviewStateSessionProvider,
    WebviewSessionProviderConfig,
    WebviewLoginSessionProvider,
    NativeGoogleSessionProvider,
    SystemSettingsService,
    SignInError,
    SharedPreferences,
    NativeAppleSessionProvider,
    NativeKeycloakSessionProvider
} from '@project-sunbird/sunbird-sdk';
import {Router} from '@angular/router';
import {SbProgressLoader} from '../../services/sb-progress-loader.service';
import {LoginNavigationHandlerService} from '../../services/login-navigation-handler.service';
import {GooglePlus} from '@awesome-cordova-plugins/google-plus/ngx';
import {PreferenceKey, SystemSettingsIds} from '../../app/app.constant';
import {Location} from '@angular/common';
// TODO: Capacitor temp fix - need to verify
import {
    SignInWithApple,
    SignInWithAppleResponse,
    SignInWithAppleOptions
    // AppleSignInErrorResponse,
    // ASAuthorizationAppleIDRequest
} from '@capacitor-community/apple-sign-in';
import { Platform } from '@ionic/angular';
import { FieldConfig } from 'common-form-elements';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
    selector: 'app-sign-in',
    templateUrl: './sign-in.page.html',
    styleUrls: ['./sign-in.page.scss'],
    providers: [LoginNavigationHandlerService]
})
export class SignInPage implements OnInit {
    appName = '';
    skipNavigation: any;
    loginConfig: FieldConfig<any>[] = [];
    loginButtonValidation: boolean = false;
    loginDet: any;

    constructor(
        @Inject('SYSTEM_SETTINGS_SERVICE') private systemSettingsService: SystemSettingsService,
        @Inject('SHARED_PREFERENCES') private preferences: SharedPreferences,
        private appHeaderService: AppHeaderService,
        private commonUtilService: CommonUtilService,
        private router: Router,
        private formAndFrameworkUtilService: FormAndFrameworkUtilService,
        private sbProgressLoader: SbProgressLoader,
        private loginNavigationHandlerService: LoginNavigationHandlerService,
        private googlePlusLogin: GooglePlus,
        private location: Location,
        public platform: Platform,
        private appGlobalService: AppGlobalService,
    ) {
        const extrasData = this.router.getCurrentNavigation().extras.state;
        this.skipNavigation = extrasData;
        if (this.platform.is('ios')) {
            // this one is to make sure keyboard has done button on top to close the keyboard
            Keyboard.setAccessoryBarVisible({isVisible: false});
        }
    }
            
    async ionViewWillEnter() {
        this.appHeaderService.hideStatusBar();
        await StatusBar.setBackgroundColor({color: '#000000'})
        await StatusBar.setStyle({style: Style.Dark})
        await this.appHeaderService.hideHeader()
    }

    async ionViewWillLeave() {
        await this.appHeaderService.showStatusBar();
        await this.appHeaderService.showHeaderWithHomeButton(['download', 'notification'])
    }

    async ngOnInit() {
        this.appName = await this.commonUtilService.getAppName();
        await this.login();
    }

    async login() {
        this.loginConfig = [
            {
                code: "Email",
                type: "input",
                templateOptions: {
                    type: "text",
                    label: "Enter Email address / mobile number",
                    placeHolder: "user@example.com / 9XXXXXXXX9"
                }
            },
            {
                code: "Password",
                type: "input",
                templateOptions: {
                    type: "password",
                    label: "Password",
                    placeHolder: "Enter your password",
                    showIcon: {
                        show: true,
                        image: {
                            active: 'assets/imgs/eye.svg',
                            inactive: 'assets/imgs/eye-off.svg'
                        },
                        direction: 'right'
                    },
                    labelHtml: {
                        contents: `<span aria-label="Forgot Password link,  Double tap to activate"  class="fgt-pwsd-lbl">Forgot Password ?</span>`,
                    }
                }
            }
        ]
    }

    onFormLoginChange(event) {
        this.loginDet = {username: event.Email, password: event.Password };
        this.loginButtonValidation = Object.values(event).every(x => (x !== null && x !== ''));
    }
                
    async onLabelClickEvent() {
        const webviewSessionProviderConfigLoader = await this.commonUtilService.getLoader();
        let webviewForgotPasswordSessionProviderConfig: WebviewSessionProviderConfig;
        let webviewMigrateSessionProviderConfig: WebviewSessionProviderConfig;
        await webviewSessionProviderConfigLoader.present();
        try {
            webviewForgotPasswordSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('login');
            webviewForgotPasswordSessionProviderConfig.context = "password";
            webviewMigrateSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('migrate');
            await webviewSessionProviderConfigLoader.dismiss();
        } catch (e) {
            await this.sbProgressLoader.hide({id: 'login'});
            await webviewSessionProviderConfigLoader.dismiss();
            this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
            return;
        }
        const webViewForgotPasswordSession = new WebviewLoginSessionProvider(
            webviewForgotPasswordSessionProviderConfig,
            webviewMigrateSessionProviderConfig
        );
        await this.loginNavigationHandlerService.setSession(webViewForgotPasswordSession, this.skipNavigation, InteractSubtype.KEYCLOAK)
        .then(() => {
            this.navigateBack(this.skipNavigation);
        });
    }

    async loginWithKeyCloak() {
        console.log('entered loginWithKeyCloak in sign-in page');
        this.appGlobalService.resetSavedQuizContent();
        if (!this.commonUtilService.networkInfo.isNetworkAvailable) {
        } else {
            this.loginNavigationHandlerService.generateLoginInteractTelemetry(InteractType.LOGIN_INITIATE, InteractSubtype.KEYCLOAK, '');
            const loginSessionProviderConfigloader = await this.commonUtilService.getLoader();
            
            let keycloakLoginSessionProviderConfig: WebviewSessionProviderConfig;
            let keycloakMigrateSessionProviderConfig: WebviewSessionProviderConfig;
            
            await loginSessionProviderConfigloader.present();
            try {
                console.log('entered try block of loginWithKeyCloak in sign-in page');
                keycloakLoginSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('login');
                keycloakMigrateSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('migrate');
                await loginSessionProviderConfigloader.dismiss();
                console.log('inaside try block in loginwithkeycloak - keycloakLoginSessionProviderConfig', keycloakLoginSessionProviderConfig);
            } catch (e) {
                console.log('entered catch block of loginWithKeyCloak in sign-in page', e);
                await this.sbProgressLoader.hide({id: 'login'});
                await loginSessionProviderConfigloader.dismiss();
                this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
                return;
            }
            let config = {WebviewSessionProviderConfig: keycloakLoginSessionProviderConfig, NativeKeycloakTokens: this.loginDet}
            const nativeSessionKeycloakProvider = new NativeKeycloakSessionProvider(keycloakLoginSessionProviderConfig, this.loginDet)
            await this.loginNavigationHandlerService.setSession(nativeSessionKeycloakProvider, this.skipNavigation, InteractSubtype.KEYCLOAK)
            .then(() => {
                this.navigateBack(this.skipNavigation);
            })
        }
    }

    async loginWithStateSystem() {
        this.loginNavigationHandlerService.generateLoginInteractTelemetry
        (InteractType.LOGIN_INITIATE, InteractSubtype.STATE, '');
        const webviewSessionProviderConfigLoader = await this.commonUtilService.getLoader();
        let webviewStateSessionProviderConfig: WebviewStateSessionProviderConfig;
        let webviewMigrateSessionProviderConfig: WebviewSessionProviderConfig;
        await webviewSessionProviderConfigLoader.present();
        try {
            webviewStateSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('state');
            webviewMigrateSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('migrate');
            await webviewSessionProviderConfigLoader.dismiss();
        } catch (e) {
            await this.sbProgressLoader.hide({id: 'login'});
            await webviewSessionProviderConfigLoader.dismiss();
            this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
            return;
        }
        const webViewStateSession = new WebviewStateSessionProvider(
            webviewStateSessionProviderConfig,
            webviewMigrateSessionProviderConfig
        );
        await this.loginNavigationHandlerService.setSession(webViewStateSession, this.skipNavigation, InteractSubtype.STATE).then(() => {
            this.navigateBack(this.skipNavigation);
        });
    }

    async signInWithGoogle() {
        console.log('entered signInWithGoogle in sign-in page');
        this.loginNavigationHandlerService.generateLoginInteractTelemetry
        (InteractType.LOGIN_INITIATE, InteractSubtype.GOOGLE, '');
        const clientId = await this.systemSettingsService.getSystemSettings({id: SystemSettingsIds.GOOGLE_CLIENT_ID}).toPromise();
        console.log('clientId', clientId);
        this.googlePlusLogin.login({
            webClientId: clientId.value
        }).then(async (result) => {
            console.log('printing the result', result);
            await this.sbProgressLoader.show({id: 'login'});
            const nativeSessionGoogleProvider = new NativeGoogleSessionProvider(() => result);
            await this.preferences.putBoolean(PreferenceKey.IS_GOOGLE_LOGIN, true).toPromise();
            await this.loginNavigationHandlerService.setSession(nativeSessionGoogleProvider, this.skipNavigation, InteractSubtype.GOOGLE)
            .then(() => {
                console.log('navigateBack inside signinwithgoogle', this.skipNavigation);
                this.navigateBack(this.skipNavigation);
            });
        }).catch(async (err) => {
            console.log('printing the err', err);
            await this.sbProgressLoader.hide({id: 'login'});
            if (err instanceof SignInError) {
                console.log('printing the err message', err.message);
                this.commonUtilService.showToast(err.message);
            } else {
                console.log('printing the else part in the catch block');
                this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
            }
        });
    }

    async register() {
        console.log('entered register in sign-in page');
        const webviewSessionProviderConfigLoader = await this.commonUtilService.getLoader();
        let webviewRegisterSessionProviderConfig: WebviewRegisterSessionProviderConfig;
        let webviewMigrateSessionProviderConfig: WebviewSessionProviderConfig;
        await webviewSessionProviderConfigLoader.present();
        try {
            webviewRegisterSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('register');
            webviewMigrateSessionProviderConfig = await this.formAndFrameworkUtilService.getWebviewSessionProviderConfig('migrate');
            await webviewSessionProviderConfigLoader.dismiss();
            console.log('webviewRegisterSessionProviderConfig', webviewRegisterSessionProviderConfig);
        } catch (e) {
            await this.sbProgressLoader.hide({id: 'login'});
            await webviewSessionProviderConfigLoader.dismiss();
            this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
            return;
        }
        const webViewRegisterSession = new WebviewLoginSessionProvider(
            webviewRegisterSessionProviderConfig,
            webviewMigrateSessionProviderConfig
        );
        await this.loginNavigationHandlerService.setSession(webViewRegisterSession, this.skipNavigation, InteractSubtype.KEYCLOAK)
        .then(() => {
            this.navigateBack(this.skipNavigation);
        });
    }

    private navigateBack(skipNavigation) {
        if ((skipNavigation && skipNavigation.navigateToCourse) ||
            (skipNavigation && (skipNavigation.source === 'user' ||
                skipNavigation.source === 'resources'))) {
            this.location.back();
        }
    }

    async appleSignIn() {
        this.loginNavigationHandlerService.generateLoginInteractTelemetry
        (InteractType.TOUCH, InteractSubtype.LOGIN_INITIATE, '');
        const clientId = await this.systemSettingsService.getSystemSettings({id: SystemSettingsIds.GOOGLE_CLIENT_ID}).toPromise();
        
        SignInWithApple.authorize({
            clientId: clientId.value,
            redirectURI: "string",
            // requestedScopes: [
            //   ASAuthorizationAppleIDRequest.ASAuthorizationScopeEmail
            // ]
          })
          .then(async (res: SignInWithAppleResponse) => {
            // https://developer.apple.com/documentation/signinwithapplerestapi/verifying_a_user
            await this.sbProgressLoader.show({id: 'login'});
            const nativeSessionAppleProvider = new NativeAppleSessionProvider(() => res.response as any);
            await this.preferences.putBoolean(PreferenceKey.IS_APPLE_LOGIN, true).toPromise();
            await this.loginNavigationHandlerService.setSession(nativeSessionAppleProvider, this.skipNavigation,
                 InteractSubtype.APPLE).then(() => {
                this.navigateBack(this.skipNavigation);
            }).catch(err => {
                this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
            });
          })
          .catch((error: any) => {
            this.commonUtilService.showToast('ERROR_WHILE_LOGIN');
          });
    }
}