import { Component, OnInit, Inject, NgZone, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Events } from '../../util/events';
import { Router } from '@angular/router';
import {
  Content,
  ContentDeleteRequest,
  ContentDeleteResponse,
  ContentDeleteStatus,
  ContentRequest,
  ContentService,
  ContentSortCriteria,
  ContentSpaceUsageSummaryRequest,
  ContentSpaceUsageSummaryResponse,
  DeviceInfo,
  Profile,
  SortOrder,
  StorageService,
  StorageDestination
} from '@project-sunbird/sunbird-sdk';
import { AppGlobalService } from '../../services/app-global-service.service';
import { AppHeaderService, } from '../../services/app-header.service';
import { CommonUtilService, } from '../../services/common-util.service';
import { TelemetryGeneratorService } from '../../services/telemetry-generator.service';
import { AppStorageInfo, DownloadManagerPageInterface, EmitedContents } from './download-manager.interface';
import { RouterLinks, ContentFilterConfig, EventTopics } from '../../app/app.constant';
import { SbPopoverComponent } from '../../app/components/popups/sb-popover/sb-popover.component';
import { PageId, InteractType, Environment, InteractSubtype } from '../../services/telemetry-constants';
import { FormAndFrameworkUtilService } from '../../services/formandframeworkutil.service';
import { featureIdMap } from '../feature-id-map';
import { BehaviorSubject } from 'rxjs';
import {
  SbInsufficientStoragePopupComponent
} from '../../app/components/popups/sb-insufficient-storage-popup/sb-insufficient-storage-popup';
import { DownloadsTabComponent } from './downloads-tab/downloads-tab.component';
import { finalize, tap, skip, takeWhile } from 'rxjs/operators';
import { ContentUtil } from '../../util/content-util';
// TODO: Capacitor temp fix 
// import { DbService } from '../manage-learn/core/services/db.service';
// import { UtilsService, LocalStorageService } from '../manage-learn/core';
// import { storageKeys } from '../manage-learn/storageKeys';

@Component({
  selector: 'app-download-manager',
  templateUrl: './download-manager.page.html',
  styleUrls: ['./download-manager.page.scss'],
})
export class DownloadManagerPage implements DownloadManagerPageInterface, OnInit {
  headerObservable: any;
  _toast: any;
  storageInfo: AppStorageInfo;
  downloadedContents: Content[] = [];
  defaultImg = this.commonUtilService.convertFileSrc('assets/imgs/ic_launcher.png');
  loader: any;
  deleteAllConfirm;
  appName: string;
  sortCriteria: ContentSortCriteria[];
  storageDestination: any;
  private deletedContentListTitle$?: BehaviorSubject<string>;
  @ViewChild('downloadsTab', { static: false }) downloadsTab: DownloadsTabComponent;

  constructor(
    @Inject('CONTENT_SERVICE') private contentService: ContentService,
    @Inject('DEVICE_INFO') private deviceInfo: DeviceInfo,
    @Inject('STORAGE_SERVICE') private storageService: StorageService,
    private ngZone: NgZone,
    public commonUtilService: CommonUtilService,
    private headerService: AppHeaderService,
    private events: Events,
    private popoverCtrl: PopoverController,
    private appGlobalService: AppGlobalService,
    private router: Router,
    private telemetryGeneratorService: TelemetryGeneratorService,
    private formAndFrameworkUtilService: FormAndFrameworkUtilService,
    // TODO: Capacitor temp fix 
    // private db: DbService,
    // private storage: LocalStorageService,
    // private utils: UtilsService
  ) {
    this.events.subscribe(EventTopics.LAST_ACCESS_ON, async (data) => {
      if (data) {
        await this.getDownloadedContents();
      }
    });
  }

  async ngOnInit() {
    this.subscribeContentUpdateEvents();
    return Promise.all(
      [this.getDownloadedContents(true),
      this.getAppName()]
    );
  }

  async ionViewWillEnter() {
    this.events.subscribe('update_header', async () => {
      await this.headerService.showHeaderWithHomeButton(['download', 'settings']);
    });
    this.headerObservable = this.headerService.headerEventEmitted$.subscribe(async eventName => {
      await this.handleHeaderEvents(eventName);
    });

    await this.headerService.showHeaderWithHomeButton(['download', 'settings']);
    await this.getAppStorageInfo();
    await this.getDownloadedContents();
    this.checkAvailableSpace();
    await this.fetchStorageDestination();
    this.events.subscribe(EventTopics.HAMBURGER_MENU_CLICKED, async () => {
      await this.closeSelectAllPopup();
    });
  }

  private async getAppName() {
    return await this.commonUtilService.getAppName()
      .then((appName: any) => {
        this.appName = appName;
      }).catch(err => console.log(err));
  }

  private async getAppStorageInfo(): Promise<AppStorageInfo> {
    const req: ContentSpaceUsageSummaryRequest = { paths: [this.storageService.getStorageDestinationDirectoryPath()] };
    return this.contentService.getContentSpaceUsageSummary(req).toPromise()
      .then((res: ContentSpaceUsageSummaryResponse[]) => {
        return this.deviceInfo.getAvailableInternalMemorySize().toPromise()
          .then((size) => {
            this.storageInfo = {
              usedSpace: res[0].sizeOnDevice,
              availableSpace: parseInt(size, 10)
            };
            return this.storageInfo;
          });
      });
  }

  async getDownloadedContents(shouldGenerateTelemetry?, ignoreLoader?) {
    const profile: Profile = this.appGlobalService.getCurrentUser();

    const defaultSortCriteria: ContentSortCriteria[] = [{
      sortAttribute: 'sizeOnDevice',
      sortOrder: SortOrder.DESC
    }];
    const primaryCategories = await this.formAndFrameworkUtilService.getSupportedContentFilterConfig(
      ContentFilterConfig.NAME_DOWNLOADS);
    const requestParams: ContentRequest = {
      uid: profile.uid,
      primaryCategories,
      audience: [],
      sortCriteria: this.sortCriteria || defaultSortCriteria
    };
    if (shouldGenerateTelemetry) {
      await this.getAppStorageInfo();
    }
    await this.contentService.getContents(requestParams).toPromise()
      .then(async data => {
        if (shouldGenerateTelemetry) {
          this.generateInteractTelemetry(data.length, this.storageInfo.usedSpace, this.storageInfo.availableSpace);
        }
        data.forEach((value) => {
          console.log('printing the value inside getDownloadedContents', value)
          value.contentData['lastUpdatedOn'] = value.lastUpdatedTime;
          value.contentData.appIcon = ContentUtil.getAppIcon(value.contentData.appIcon,
            value.basePath, this.commonUtilService.networkInfo.isNetworkAvailable);
        });
        const query = {
            selector: {
           downloaded: true,
          },
        }; 
        // TODO: Capacitor temp fix 
        // if(this.db.pdb){
        //   let projectData: any = await this.db.customQuery(query);
        //   if (projectData.docs) {
        //     projectData.docs.sort(function (a, b) {
        //         return  new Date(b.updatedAt || b.syncedAt).valueOf() - new Date(a.updatedAt || a.syncedAt).valueOf() ;
        //       });
        //       projectData.docs.map(doc => {
        //         doc.contentData = { lastUpdatedOn: doc.updatedAt,name:doc.title };
        //         doc.type = 'project'
        //         doc.identifier=doc._id;
        //         data.push(doc)
        //     })
        //   }
        // }
        // await this.storage
        // .getLocalStorage(storageKeys.downloadedObservations)
        // .then(resp => {
        //   resp.sort(function(a, b) {
        //     return ( new Date(b.lastViewedAt).valueOf() - new Date(a.lastViewedAt).valueOf());
        //   });
        //   resp.map(res => {
        //     res.contentData = { lastUpdatedOn: res.lastViewedAt, name: res.name, subject:res.programName };
        //     res.type = 'observation';
        //     res.identifier = res.programId + res.solutionId;
        //     data.push(res);
        //   });
        // }).catch(err => console.log(err));
        await this.ngZone.run(async () => {
          this.downloadedContents = data;
        });
      }).catch(err => console.log(err));
  }

  private generateInteractTelemetry(contentCount: number, usedSpace: number, availableSpace: number) {
    const valuesMap = {};
    valuesMap['count'] = contentCount;
    valuesMap['spaceTakenByApp'] = this.commonUtilService.fileSizeInMB(usedSpace);
    valuesMap['freeSpace'] = this.commonUtilService.fileSizeInMB(availableSpace);
    this.telemetryGeneratorService.generateExtraInfoTelemetry(valuesMap, PageId.DOWNLOADS);
  }

  async deleteContents(emitedContents: EmitedContents) {
    const projectContents = emitedContents.selectedContents.filter((content) => (content['type'] == 'project'));
    const observationContents = emitedContents.selectedContents.filter( content => (content['type'] == 'observation'));
    emitedContents.selectedContents = emitedContents.selectedContents.filter(content => !content['type'] || (content['type'] != 'project' && content['type'] != 'observation'));

    if (!emitedContents.selectedContents.length) {
      this.deleteProjects(projectContents);
      this.deleteObservations(observationContents).then().catch(e => console.error(e));
      return;
    }
    this.deleteProjects(projectContents)
    this.deleteObservations(observationContents).then().catch(e => console.error(e));

    const contentDeleteRequest: ContentDeleteRequest = {
      contentDeleteList: emitedContents.selectedContents,
    };

    if (emitedContents.selectedContents.length > 1) {
      await this.deleteAllContents(emitedContents);
    } else {
      this.loader = await this.commonUtilService.getLoader();
      await this.loader.present();

      this.contentService.deleteContent(contentDeleteRequest).toPromise()
        .then(async (data: ContentDeleteResponse[]) => {
          await this.loader.dismiss();
          this.loader = undefined;
          if (data && data[0].status === ContentDeleteStatus.NOT_FOUND) {
            this.commonUtilService.showToast(this.commonUtilService.translateMessage('CONTENT_DELETE_FAILED'));
          } else {
            this.events.publish('savedResources:update', {
              update: true
            });
            this.commonUtilService.showToast(this.commonUtilService.translateMessage('MSG_RESOURCE_DELETED'));
          }
        }).catch(async (error: any) => {
          await this.loader.dismiss();
          this.loader = undefined;
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('CONTENT_DELETE_FAILED'));
        });
    }
  }

  private async deleteAllContents(emitedContents) {
    const valuesMap = {};
    valuesMap['size'] = this.commonUtilService.fileSizeInMB(emitedContents.selectedContentsInfo.totalSize);
    valuesMap['count'] = emitedContents.selectedContentsInfo.count;
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.DELETE_CLICKED,
      Environment.DOWNLOADS,
      PageId.BULK_DELETE_CONFIRMATION_POPUP, undefined,
      valuesMap,
      undefined,
      featureIdMap.downloadManager.DOWNLOADS_DELETE);
    const contentDeleteRequest: ContentDeleteRequest = {
      contentDeleteList: emitedContents.selectedContents
    };
    this.deletedContentListTitle$ = new BehaviorSubject('0/' + contentDeleteRequest.contentDeleteList.length);
    this.deleteAllConfirm = await this.popoverCtrl.create({
      component: SbPopoverComponent,
      componentProps: {
        sbPopoverHeading: this.commonUtilService.translateMessage('DELETE_PROGRESS'),
        actionsButtons: [
          {
            btntext: this.commonUtilService.translateMessage('CANCEL'),
            btnClass: 'sb-btn sb-btn-sm sb-btn-outline-info cancel-delete'
          },
        ],
        icon: null,
        metaInfo: this.commonUtilService.translateMessage('FILES_DELETED'),
        sbPopoverDynamicMainTitle: this.deletedContentListTitle$
      },
      cssClass: 'sb-popover danger sb-popover-cancel-delete',
    });
    await this.deleteAllConfirm.present();

    let response = this.deleteAllConfirm.onDidDismiss()
    if (response) {
      await this.contentService.clearContentDeleteQueue().toPromise();
    }
    await this.contentService.enqueueContentDelete(contentDeleteRequest).toPromise();
    this.contentService.getContentDeleteQueue().pipe(
      skip(1),
      takeWhile((list) => !!list.length),
      finalize(() => {
        this.deletedContentListTitle$
          .next(`${contentDeleteRequest.contentDeleteList.length}/${contentDeleteRequest.contentDeleteList.length}`);

        this.deleteAllConfirm.dismiss();
        this.events.publish('savedResources:update', {
          update: true
        });
      })
    )
      .subscribe((list) => {
        this.deletedContentListTitle$
          .next(`${contentDeleteRequest.contentDeleteList.length - list.length}/${contentDeleteRequest.contentDeleteList.length}`);
      });
  }

  onSortCriteriaChange(sortAttribute): void {
    let sortAttr: string;
    if (sortAttribute.selectedItem === 'CONTENT_SIZE') {
      sortAttr = 'sizeOnDevice';
    } else if (sortAttribute.selectedItem === 'LAST_VIEWED') {
      sortAttr = 'lastUsedOn';
    }
    const valuesMap = {};
    valuesMap['selectedOption'] = sortAttr;
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.SORT_OPTION_SELECTED,
      Environment.DOWNLOADS,
      PageId.DOWNLOADS,
      undefined,
      valuesMap,
      undefined,
      featureIdMap.downloadManager.DOWNLOADS_SORT
    );
    this.sortCriteria = [{
      sortOrder: SortOrder.DESC,
      sortAttribute: sortAttr
    }];
    this.getDownloadedContents().then().catch(e => console.error(e));
  }

  ionViewWillLeave(): void {
    this.events.unsubscribe('update_header');
    this.headerObservable.unsubscribe();
    this.events.unsubscribe(EventTopics.HAMBURGER_MENU_CLICKED);
    this.events.unsubscribe(EventTopics.LAST_ACCESS_ON);
  }

  private subscribeContentUpdateEvents() {
    this.events.subscribe('savedResources:update', async (res) => {
      if (res && res.update) {
        await this.getDownloadedContents(false, true);
        await this.getAppStorageInfo();
      }
    });
  }

  private async handleHeaderEvents($event) {
    switch ($event.name) {
      case 'download':
        await this.redirectToActivedownloads();
        break;
      case 'settings':
        await this.closeSelectAllPopup();
        this.redirectToSettings();
        break;
    }
  }
  
  private async redirectToActivedownloads() {
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.ACTIVE_DOWNLOADS_CLICKED,
      Environment.DOWNLOADS,
      PageId.DOWNLOADS);
    await this.router.navigate([RouterLinks.ACTIVE_DOWNLOADS]);
  }

  private async redirectToSettings() {
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.SETTINGS_CLICKED,
      Environment.DOWNLOADS,
      PageId.DOWNLOADS);
    await this.router.navigate([RouterLinks.STORAGE_SETTINGS]);
  }

  private async fetchStorageDestination() {
    this.storageDestination = await this.storageService.getStorageDestination().toPromise();
  }

  private async presentPopupForLessStorageSpace() {
    this._toast = await this.popoverCtrl.create({
      component: SbInsufficientStoragePopupComponent,
      componentProps: {
        sbPopoverHeading: this.commonUtilService.translateMessage('INSUFFICIENT_STORAGE'),
        sbPopoverMessage: this.storageDestination === StorageDestination.INTERNAL_STORAGE ?
          this.commonUtilService.translateMessage('MOVE_FILES_TO_OTHER_DESTINATION', this.commonUtilService.translateMessage('SD_CARD')) :
          this.commonUtilService.translateMessage('MOVE_FILES_TO_OTHER_DESTINATION', this.commonUtilService.translateMessage(
            'INTERNAL_MEMORY'
          )),
      },
      cssClass: 'sb-popover no-network',
    });
    await this._toast.present();
  }

  private checkAvailableSpace() {
    this.storageService.getStorageDestinationVolumeInfo().pipe(
      tap(async (volumeInfo) => {
        if (volumeInfo.info.availableSize < 209715200) {
          await this.presentPopupForLessStorageSpace();
        }
      })
    )
      .subscribe();
  }

  async closeSelectAllPopup() {
    if (this.downloadsTab && this.downloadsTab.deleteAllConfirm) {
      await this.downloadsTab.deleteAllConfirm.dismiss();
      await this.downloadsTab.unSelectAllContents();
    }
  }

  deleteProjects(contents) {

    contents.forEach(async (element) => {
      // TODO: Capacitor temp fix 
      // let project = await this.db.getById(element.contentId)
      // project.downloaded = false
      // await this.db.delete(project._id, project._rev)
      this.events.publish('savedResources:update', {
        update: true,
      });
      this.commonUtilService.showToast(this.commonUtilService.translateMessage('MSG_RESOURCE_DELETED'));


    });
  }
  async deleteObservations(content) {
    // TODO: Capacitor temp fix 
    // let downloadedObs = await this.storage.getLocalStorage(storageKeys.downloadedObservations);
    // const contentIds = content.map(c => c.contentId)
    // downloadedObs = downloadedObs.filter(obs => {
    //   const shouldDelete = contentIds.includes(obs.programId + obs.solutionId)
    //   if (shouldDelete) {
    //     obs.downloadedSubmission.forEach(async submission => {
    //       await this.storage.deleteOneStorage(this.utils.getAssessmentLocalStorageKey(submission));
    //     });
    //   } 
    //   return !shouldDelete
    // })
    // await this.storage.setLocalStorage(storageKeys.downloadedObservations,downloadedObs);
    // this.events.publish("savedResources:update", {update: true});
    //   this.commonUtilService.showToast(
    //     this.commonUtilService.translateMessage("MSG_RESOURCE_DELETED")
    //   );
  }
}
