import { ContentDetailsPage } from '../content-details/content-details.page';
import { Container } from 'inversify';
import {
    AuthService,
    ContentService,
    EventsBusService,
    PlayerService,
    PlayerServiceImpl,
    ProfileService,
    ProfileServiceImpl,
    SharedPreferences,
    StorageService,
    TelemetryObject,
    Content
} from 'sunbird-sdk';
import { ContentServiceImpl } from 'sunbird-sdk/content/impl/content-service-impl';
import { EventsBusServiceImpl } from 'sunbird-sdk/events-bus/impl/events-bus-service-impl';
import { StorageServiceImpl } from 'sunbird-sdk/storage/impl/storage-service-impl';
import { AuthServiceImpl } from 'sunbird-sdk/auth/impl/auth-service-impl';
import { Events, Platform, PopoverController, ToastController } from '@ionic/angular';
import { NgZone } from '@angular/core';
import { SbPopoverComponent } from '../components/popups/sb-popover/sb-popover.component';
import {
    AppGlobalService,
    AppHeaderService,
    CommonUtilService,
    ContentShareHandlerService,
    CourseUtilService,
    TelemetryGeneratorService,
    UtilityService,
} from '@app/services';
import { Network } from '@ionic-native/network/ngx';
import { FileSizePipe } from '@app/pipes/file-size/file-size';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileSwitchHandler } from '@app/services/user-groups/profile-switch-handler';
import { RatingHandler } from '@app/services/rating/rating-handler';
import { ContentPlayerHandler } from '@app/services/content/player/content-player-handler';
import { ChildContentHandler } from '@app/services/content/child-content-handler';
import { ContentDeleteHandler } from '@app/services/content/content-delete-handler';
import { of } from 'rxjs';
import { mockContentData } from '@app/app/content-details/content-details.page.spec.data';
import { LoginHandlerService } from '@app/services/login-handler.service';
import {
    Environment,
    ImpressionType,
    InteractSubtype,
    InteractType,
    Mode,
    PageId,
} from '@app/services/telemetry-constants';
import { ContentUtil } from '@app/util/content-util';
import { EventTopics, ContentType, ShareItemType } from '../app.constant';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { FileTransfer } from '@ionic-native/file-transfer/ngx';

describe('ContentDetailsPage', () => {
    let contentDetailsPage: ContentDetailsPage;
    const container = new Container();

    const mockProfileService: Partial<ProfileService> = {};
    const mockContentService: Partial<ContentService> = {};
    const mockEventBusService: Partial<EventsBusService> = {};
    const mockPreferences: Partial<SharedPreferences> = {};
    const mockPlayerService: Partial<PlayerService> = {};
    const mockStorageService: Partial<StorageService> = {};
    const mockAuthService: Partial<AuthService> = {};
    const mockNgZone: Partial<NgZone> = {
        run: jest.fn()
    };
    const mockEvents: Partial<Events> = {
        subscribe: jest.fn(() => 'playConfig')
    };
    const mockPopoverController: Partial<PopoverController> = {};
    const mockPlatform: Partial<Platform> = {};
    const mockAppGlobalService: Partial<AppGlobalService> = {
        getCurrentUser: jest.fn()
    };
    const mockTelemetryGeneratorService: Partial<TelemetryGeneratorService> = {
        generateInteractTelemetry: jest.fn(),
        generateEndTelemetry: jest.fn()
    };
    const mockCommonUtilService: Partial<CommonUtilService> = {};
    const mockCourseUtilService: Partial<CourseUtilService> = {};
    const mockUtilityService: Partial<UtilityService> = {
        getDeviceAPILevel: jest.fn(() => Promise.resolve('sample')),
        checkAppAvailability: jest.fn(() => Promise.resolve('sample_check'))
    };
    const mockNetwork: Partial<Network> = {};
    const mockFileSizePipe: Partial<FileSizePipe> = {};
    const mockHeaderService: Partial<AppHeaderService> = {};
    const mockContentShareHandler: Partial<ContentShareHandlerService> = {};
    const mockAppVersion: Partial<AppVersion> = {};
    const mockLocation: Partial<Location> = {};
    const mockRouter: Partial<Router> = {
        getCurrentNavigation: jest.fn(() => mockContentData)
    };
    const mockRoute: Partial<ActivatedRoute> = {
        queryParams: of({})
    };
    const mockProfileSwitchHandler: Partial<ProfileSwitchHandler> = {};
    const mockRatingHandler: Partial<RatingHandler> = {
        resetRating: jest.fn()
    };
    const mockContentPlayerHandler: Partial<ContentPlayerHandler> = {
        launchContentPlayer: jest.fn()
    };
    const mockChildContentHandler: Partial<ChildContentHandler> = {};
    const mockContentDeleteHandler: Partial<ContentDeleteHandler> = {};
    const mockLoginHandlerService: Partial<LoginHandlerService> = {};
    const mockToastController: Partial<ToastController> = {};
    const mockFileOpener: Partial<FileOpener> = {};
    const mockFileTransfer: Partial<FileTransfer> = {};
    const telemetryObject = new TelemetryObject('do_12345', 'Resource', '1');
    const rollUp = { l1: 'do_123', l2: 'do_123', l3: 'do_1' };

    beforeAll(() => {
        contentDetailsPage = new ContentDetailsPage(
            mockProfileService as ProfileServiceImpl,
            mockContentService as ContentServiceImpl,
            mockEventBusService as EventsBusServiceImpl,
            mockPreferences as SharedPreferences,
            mockPlayerService as PlayerServiceImpl,
            mockStorageService as StorageServiceImpl,
            mockAuthService as AuthServiceImpl,
            mockNgZone as NgZone,
            mockEvents as Events,
            mockPopoverController as PopoverController,
            mockPlatform as Platform,
            mockAppGlobalService as AppGlobalService,
            mockTelemetryGeneratorService as TelemetryGeneratorService,
            mockCommonUtilService as CommonUtilService,
            mockCourseUtilService as CourseUtilService,
            mockUtilityService as UtilityService,
            mockNetwork as Network,
            mockFileSizePipe as FileSizePipe,
            mockHeaderService as AppHeaderService,
            mockContentShareHandler as ContentShareHandlerService,
            mockAppVersion as AppVersion,
            mockLocation as Location,
            mockRouter as Router,
            mockRoute as ActivatedRoute,
            mockProfileSwitchHandler as ProfileSwitchHandler,
            mockRatingHandler as RatingHandler,
            mockContentPlayerHandler as ContentPlayerHandler,
            mockChildContentHandler as ChildContentHandler,
            mockContentDeleteHandler as ContentDeleteHandler,
            mockLoginHandlerService as LoginHandlerService,
            mockFileOpener as FileOpener,
            mockFileTransfer as FileTransfer,
        );
    });
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('should create instance of contentDetailsPage', () => {
        expect(contentDetailsPage).toBeTruthy();
    });

    it('should get extras from content || navigation when getExtras() called', () => {
        // arrange
        const extras = mockContentData.extras.state;
        spyOn(contentDetailsPage, 'getNavParams');
        // act
        contentDetailsPage.getNavParams();
        // assert
        expect(contentDetailsPage.getNavParams).toHaveBeenCalled();
    });

    it('should call subscribeEvents when ngOnInit() invoked', () => {
        // arrange
        spyOn(contentDetailsPage, 'subscribeEvents').and.stub();
        // act
        contentDetailsPage.ngOnInit();
        // assert
        expect(contentDetailsPage.subscribeEvents).toHaveBeenCalled();
    });

    it('should invoke appVersion() and other subscription() when invoked', (done) => {
        // arrange
        mockAppVersion.getAppName = jest.fn(() => Promise.resolve('sunbird'));
        mockRatingHandler.showRatingPopup = jest.fn();
        mockContentPlayerHandler.setLastPlayedContentId = jest.fn();
        const called: { [topic: EventTopics]: boolean } = {};
        mockEvents.subscribe = jest.fn((topic, fn) => {
            if (called[topic]) {
                return;
            }

            called[topic] = true;

            if (topic === EventTopics.PLAYER_CLOSED) {
                fn({ selectedUser: 'sampleUser' });
            }
            if (topic === EventTopics.NEXT_CONTENT) {
                fn({ data: 'sample_data' });
            }
        });
        mockRouter.getCurrentNavigation = jest.fn(() => mockContentData);
        mockProfileService.getActiveProfileSession = jest.fn(() =>
            of({ uid: 'sample_uid', sid: 'sample_session_id', createdTime: Date.now() }));
        mockProfileSwitchHandler.switchUser = jest.fn();
        spyOn(contentDetailsPage, 'calculateAvailableUserCount').and.stub();
        spyOn(contentDetailsPage, 'generateEndEvent').and.stub();
        mockEvents.unsubscribe = jest.fn((topic) => {
            console.log(topic);
            called[topic] = false;
        });
        spyOn(contentDetailsPage, 'generateTelemetry').and.stub();
        // act
        contentDetailsPage.subscribeEvents();
        // assert
        setTimeout(() => {
            expect(mockAppVersion.getAppName).toHaveBeenCalled();
            expect(mockEvents.subscribe).toHaveBeenCalled();
            expect(mockProfileService.getActiveProfileSession).toHaveBeenCalled();
            expect(mockProfileSwitchHandler.switchUser).toHaveBeenCalled();
            expect(mockRatingHandler.showRatingPopup).toHaveBeenCalled();
            expect(mockContentPlayerHandler.setLastPlayedContentId).toHaveBeenCalled();
            done();
        }, 1000);
    });

    it('should invoke appVersion() and other subscription() if data is false when invoked', (done) => {
        // arrange
        mockAppVersion.getAppName = jest.fn(() => Promise.resolve('sunbird'));
        mockRatingHandler.showRatingPopup = jest.fn();
        mockContentPlayerHandler.setLastPlayedContentId = jest.fn();
        const called: { [topic: EventTopics]: boolean } = {};
        mockEvents.subscribe = jest.fn((topic, fn) => {
            if (called[topic]) {
                return;
            }

            called[topic] = true;

            if (topic === EventTopics.PLAYER_CLOSED) {
                fn({ selectedUser: { profileType: 'Teacher' } });
            }
            // if (topic === EventTopics.NEXT_CONTENT) {
            //     fn({data: 'sample_data'});
            // }
        });
        mockProfileSwitchHandler.switchUser = jest.fn();
        spyOn(contentDetailsPage, 'calculateAvailableUserCount').and.stub();
        mockEvents.unsubscribe = jest.fn((topic) => {
            console.log(topic);
            called[topic] = false;
        });
        // act
        contentDetailsPage.subscribeEvents();
        // assert
        setTimeout(() => {
            expect(mockAppVersion.getAppName).toHaveBeenCalled();
            expect(mockEvents.subscribe).toHaveBeenCalled();
            expect(mockProfileSwitchHandler.switchUser).toHaveBeenCalledWith({ profileType: 'Teacher' });
            done();
        }, 0);
    });

    it('should be logged in before play the content by invoked promptToLogin() if user loggedin', async (done) => {
        // arrange
        mockAppGlobalService.isUserLoggedIn = jest.fn(() => true);
        contentDetailsPage.autoPlayQuizContent = true;
        jest.spyOn(contentDetailsPage, 'handleContentPlay').mockImplementation(() => {
            return 0;
        });
        // act
        await contentDetailsPage.promptToLogin();
        // assert
        setTimeout(() => {
            expect(mockAppGlobalService.isUserLoggedIn).toHaveBeenCalled();
            done();
        }, 1000);
    });


    it('should be logged in before play the content for isLoginPromptOpen() if user is not loggedin', (done) => {
        // arrange
        mockAppGlobalService.isUserLoggedIn = jest.fn(() => false);
        contentDetailsPage.isLoginPromptOpen = true;
        // act
        contentDetailsPage.promptToLogin();
        // assert
        setTimeout(() => {
            expect(mockAppGlobalService.isUserLoggedIn).toHaveBeenCalled();
            expect(contentDetailsPage.isLoginPromptOpen).toBeTruthy();
            done();
        }, 0);
    });

    it('should check limitedShareContentFlag', () => {
        // arrange
        const request = {
            contentData: {
                status: 'Unlisted'
            }
        };
        jest.spyOn(ContentUtil, 'getTelemetryObject').mockImplementation(() => {
            return request;
        });
        jest.spyOn(contentDetailsPage, 'promptToLogin').mockImplementation(() => {
            return;
        });
        // act
        contentDetailsPage.checkLimitedContentSharingFlag(request);
        // assert
        expect(ContentUtil.getTelemetryObject).toHaveBeenCalled();
        expect(contentDetailsPage.promptToLogin).toHaveBeenCalled();
    });

    it('should check limitedShareContentFlag', () => {
        // arrange
        const request = {
            contentData: {
                status: 'Unlisted'
            }
        };
        jest.spyOn(ContentUtil, 'getTelemetryObject').mockImplementation(() => {
            return request;
        });
        jest.spyOn(contentDetailsPage, 'promptToLogin').mockImplementation(() => {
            return;
        });
        // act
        contentDetailsPage.checkLimitedContentSharingFlag(request);
        // assert
        expect(ContentUtil.getTelemetryObject).toHaveBeenCalled();
        expect(contentDetailsPage.promptToLogin).toHaveBeenCalled();
    });

    it('shouldn\'t  show PlayAsPopup if limitedShareContentFlag flag is true', (done) => {
        // arrange
        contentDetailsPage.userCount = 3;
        contentDetailsPage.shouldOpenPlayAsPopup = true;
        mockNetwork.type = '3g';
        contentDetailsPage.limitedShareContentFlag = true;
        jest.spyOn(contentDetailsPage, 'openPlayAsPopup');
        // act
        contentDetailsPage.showSwitchUserAlert(false);
        // assert
        expect(contentDetailsPage.openPlayAsPopup).toHaveBeenCalledTimes(0);
        done();
    });

    it('shouldn playContent if network is available and more than 2g and user count is not more than 2', (done) => {
        // arrange
        contentDetailsPage.userCount = 2;
        contentDetailsPage.apiLevel = 19;
        contentDetailsPage.appAvailability = 'false';
        contentDetailsPage.shouldOpenPlayAsPopup = true;
        mockNetwork.type = '3g';
        contentDetailsPage.limitedShareContentFlag = false;
        mockCommonUtilService.translateMessage = jest.fn(() => '');
        mockCommonUtilService.networkInfo = { isNetworkAvailable: true };
        mockPopoverController.create = jest.fn(() => (Promise.resolve({
            present: jest.fn(() => Promise.resolve({})),
            onDidDismiss: jest.fn(() => Promise.resolve({ data: { canDelete: true } }))
        } as any)));
        // act
        contentDetailsPage.showSwitchUserAlert(true).then(() => {
            // assert
            expect(mockPopoverController.create).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('should  show LowBandwidth Popup for 2g type network connection', (done) => {
        // arrange
        contentDetailsPage.content = { identifier: 'do_1234' };
        contentDetailsPage.userCount = 3;
        contentDetailsPage.shouldOpenPlayAsPopup = true;
        mockNetwork.type = '2g';
        mockCommonUtilService.translateMessage = jest.fn(() => '');
        mockPopoverController.create = jest.fn(() => (Promise.resolve({
            present: jest.fn(() => Promise.resolve({})),
            onDidDismiss: jest.fn(() => Promise.resolve({ data: { canDelete: true } }))
        } as any)));
        // act
        contentDetailsPage.showSwitchUserAlert(false);
        // assert
        expect(mockPopoverController.create).toHaveBeenCalled();
        done();
    });

    it('should  show PlayAs Popup  When LowBandwidth popup Ok button click', (done) => {
        // arrange
        contentDetailsPage.content = { identifier: 'do_1234' };
        contentDetailsPage.userCount = 3;
        contentDetailsPage.shouldOpenPlayAsPopup = false;
        mockNetwork.type = '2g';
        contentDetailsPage.limitedShareContentFlag = false;
        mockCommonUtilService.translateMessage = jest.fn(() => '');
        mockPopoverController.create = jest.fn(() => (Promise.resolve({
            present: jest.fn(() => Promise.resolve({})),
            onDidDismiss: jest.fn(() => Promise.resolve({ data: { isLeftButtonClicked: true } }))
        } as any)));
        const profile = {
            handle: 'handle'
        };
        mockAppGlobalService.getCurrentUser = jest.fn(() => profile);
        jest.spyOn(contentDetailsPage, 'openPlayAsPopup');
        // act
        contentDetailsPage.showSwitchUserAlert(false);
        // assert
        setTimeout(() => {
            expect(contentDetailsPage.openPlayAsPopup).toHaveBeenCalled();
            done();
        }, 0);

    });

    describe('openPDFPreview()', () => {
        it('should download pdf if not available locally', (done) => {
            // arrange
            const content: Partial<Content> = {
                contentData: {
                    itemSetPreviewUrl: 'http://some_domain.com/som_path.some_extension'
                }
            };
            const mockPresent = jest.fn(() => Promise.resolve());
            const mockDismiss = jest.fn(() => Promise.resolve());
            const mockDownload = jest.fn(() => Promise.resolve({
                toURL: () => 'SOME_TEMP_URL'
            }));
            mockCommonUtilService.getLoader = jest.fn(() => {
                return Promise.resolve({
                    present: mockPresent,
                    dismiss: mockDismiss
                });
            });
            mockCommonUtilService.showToast = jest.fn(() => { });
            mockFileTransfer.create = jest.fn(() => {
                return {
                    download: mockDownload
                };
            });
            window.cordova.plugins.printer.canPrintItem = jest.fn((_, cb) => { cb(true) });
            window.cordova.plugins.printer.print = jest.fn();
            // act
            contentDetailsPage.openPDFPreview(content as Content).then(() => {
                // assert
                expect(mockFileTransfer.create).toHaveBeenCalled();
                expect(mockDownload).toHaveBeenCalledWith(content.contentData.itemSetPreviewUrl, expect.any(String));
                expect(window.cordova.plugins.printer.print).toHaveBeenCalledWith('SOME_TEMP_URL');
                done();
            });
        });

        it('should not download pdf if available locally', (done) => {
            // arrange
            const content: Partial<Content> = {
                basePath: '/some_local_path/some_local_path',
                contentData: {
                    itemSetPreviewUrl: '/some_path.some_extension'
                }
            };
            const mockPresent = jest.fn(() => Promise.resolve());
            const mockDismiss = jest.fn(() => Promise.resolve());
            const mockDownload = jest.fn(() => Promise.resolve({
                toURL: () => 'SOME_TEMP_URL'
            }));
            mockCommonUtilService.getLoader = jest.fn(() => {
                return Promise.resolve({
                    present: mockPresent,
                    dismiss: mockDismiss
                });
            });
            mockCommonUtilService.showToast = jest.fn(() => { });
            mockFileTransfer.create = jest.fn(() => {
                return {
                    download: mockDownload
                };
            });
            window.cordova.plugins.printer.canPrintItem = jest.fn((_, cb) => { cb(true); });
            window.cordova.plugins.printer.print = jest.fn();
            // act
            contentDetailsPage.openPDFPreview(content as Content).then(() => {
                // assert
                expect(mockFileTransfer.create).not.toHaveBeenCalled();
                expect(mockDownload).not.toHaveBeenCalled();
                expect(window.cordova.plugins.printer.print).toHaveBeenCalledWith(
                    'file:///some_local_path/some_local_path/some_path.some_extension'
                );
                done();
            });
        });

        it('should show error toast on file print failure', (done) => {
            // arrange
            const content: Partial<Content> = {
                basePath: '/some_local_path/some_local_path',
                contentData: {
                    itemSetPreviewUrl: '/some_path.some_extension'
                }
            };
            const mockPresent = jest.fn(() => Promise.resolve());
            const mockDismiss = jest.fn(() => Promise.resolve());
            const mockDownload = jest.fn(() => Promise.resolve({
                toURL: () => 'SOME_TEMP_URL'
            }));
            mockCommonUtilService.getLoader = jest.fn(() => {
                return Promise.resolve({
                    present: mockPresent,
                    dismiss: mockDismiss
                });
            });
            mockCommonUtilService.showToast = jest.fn(() => { });
            mockFileTransfer.create = jest.fn(() => {
                return {
                    download: mockDownload
                };
            });
            window.cordova.plugins.printer.canPrintItem = jest.fn((_, cb) => { cb(true); });
            window.cordova.plugins.printer.print = jest.fn(() => { throw new Error('UNEXPECTED_ERROR'); });
            // act
            contentDetailsPage.openPDFPreview(content as Content).then(() => {
                // assert
                expect(window.cordova.plugins.printer.print).toHaveBeenCalledWith(
                    'file:///some_local_path/some_local_path/some_path.some_extension'
                );
                expect(mockDismiss).toHaveBeenCalled();
                expect(mockCommonUtilService.showToast).toHaveBeenCalledWith('ERROR_COULD_NOT_OPEN_FILE');
                done();
            });
        });

        it('should show error toast on fileCanPrint() returns false', (done) => {
            // arrange
            const content: Partial<Content> = {
                basePath: 'file://some_local_path/some_local_path',
                contentData: {
                    itemSetPreviewUrl: '/some_path.some_extension'
                }
            };
            const mockPresent = jest.fn(() => Promise.resolve());
            const mockDismiss = jest.fn(() => Promise.resolve());
            const mockDownload = jest.fn(() => Promise.resolve({
                toURL: () => 'SOME_TEMP_URL'
            }));
            mockCommonUtilService.getLoader = jest.fn(() => {
                return Promise.resolve({
                    present: mockPresent,
                    dismiss: mockDismiss
                });
            });
            mockCommonUtilService.showToast = jest.fn(() => { });
            mockFileTransfer.create = jest.fn(() => {
                return {
                    download: mockDownload
                };
            });
            window.cordova.plugins.printer.canPrintItem = jest.fn((_, cb) => { cb(false); });
            // act
            contentDetailsPage.openPDFPreview(content as Content).then(() => {
                // assert
                expect(window.cordova.plugins.printer.print).not.toHaveBeenCalledWith(
                    'file://some_local_path/some_local_path/some_path.some_extension'
                );
                expect(mockDismiss).toHaveBeenCalled();
                expect(mockCommonUtilService.showToast).toHaveBeenCalledWith('ERROR_COULD_NOT_OPEN_FILE');
                done();
            });
        });
    });

    describe('generateEndEvent()', () => {
        it('should generate END Telemetry with given contentType', () => {
            // arrange
            contentDetailsPage.telemetryObject = telemetryObject;
            contentDetailsPage.objRollup = rollUp;
            // act
            contentDetailsPage.generateEndEvent();
            // assert
            expect(mockTelemetryGeneratorService.generateEndTelemetry).toHaveBeenCalledWith(ContentType.RESOURCE,
                Mode.PLAY,
                PageId.CONTENT_DETAIL,
                Environment.HOME,
                telemetryObject,
                rollUp,
                undefined);
        });

        it('should generate END Telemetry with  contentType if telemetryObject contentType is empty', () => {
            // arrange
            contentDetailsPage.telemetryObject = new TelemetryObject('do_12345', '', '1');
            contentDetailsPage.objRollup = rollUp;
            // act
            contentDetailsPage.generateEndEvent();
            // assert
            expect(mockTelemetryGeneratorService.generateEndTelemetry).toHaveBeenCalledWith(ContentType.RESOURCE,
                Mode.PLAY,
                PageId.CONTENT_DETAIL,
                Environment.HOME,
                contentDetailsPage.telemetryObject,
                rollUp,
                undefined);
        });
    });

    describe('share()', () => {
        describe('shouldn create share popover', () => {
            it('shareItemType should be root-content', (done) => {
                // arrange
                mockCommonUtilService.translateMessage = jest.fn(() => '');
                mockPopoverController.create = jest.fn(() => (Promise.resolve({
                    present: jest.fn(() => Promise.resolve({})),
                    onDidDismiss: jest.fn(() => Promise.resolve({ data: { canDelete: true } }))
                } as any)));
                // act
                contentDetailsPage.share().then(() => {
                    // assert
                    expect(mockPopoverController.create).toHaveBeenCalledTimes(1);
                    expect(mockPopoverController.create).toHaveBeenCalledWith(expect.objectContaining({
                        componentProps: expect.objectContaining({
                            shareItemType: ShareItemType.ROOT_CONTENT
                        })
                    }));
                    done();
                });
            });
            it('shareItemType should be leaf-content', (done) => {
                // arrange
                contentDetailsPage.isChildContent = true;
                mockCommonUtilService.translateMessage = jest.fn(() => '');
                mockPopoverController.create = jest.fn(() => (Promise.resolve({
                    present: jest.fn(() => Promise.resolve({})),
                    onDidDismiss: jest.fn(() => Promise.resolve({ data: { canDelete: true } }))
                } as any)));
                // act
                contentDetailsPage.share().then(() => {
                    // assert
                    expect(mockPopoverController.create).toHaveBeenCalledTimes(1);
                    expect(mockPopoverController.create).toHaveBeenCalledWith(expect.objectContaining({
                        componentProps: expect.objectContaining({
                            shareItemType: ShareItemType.LEAF_CONTENT
                        })
                    }));
                    done();
                });
            });
        });
    });
});
