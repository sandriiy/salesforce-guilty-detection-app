import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import { showToast, isEmpty } from 'c/utils';
import { refreshApex } from '@salesforce/apex';

import getNextStep from '@salesforce/apex/ReviewProcessController.getReviewProcessNextStep';
import TOTAL_REVIEWABLE_FIELD from '@salesforce/schema/ReviewProcess__c.TotalReviewableRecords__c';

const DEFAULT_EMPTY = 'N/A';
const CHANGE_EVENT_CHANNEL = '/data/ReviewProcess__ChangeEvent';
const FIELDS = [TOTAL_REVIEWABLE_FIELD];
export default class ReviewProcessViewer extends LightningElement {
    @api recordId;
    @track isLoading = false;

    @track totalNumberOfRecords = DEFAULT_EMPTY
    @track totalNumberOfReviewers = DEFAULT_EMPTY
    @track nextStep = DEFAULT_EMPTY
    @track nextStepStyle;
    nextStepResult;
    messageType;
    helpText = DEFAULT_EMPTY;
    channelName = CHANGE_EVENT_CHANNEL;
    subscription = {};

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    recordHandler({ error, data }) {
        if (data) {
            let totalRecords = data.fields.TotalReviewableRecords__c.value;
            if (!isEmpty(totalRecords)) {
                this.totalNumberOfRecords = totalRecords;
            }
        }
        else if (error) {
            showToast(
                this,
                'Failed to display summary information.',
                'Please contact your System Administrator',
                'error'
            );
        }
    }

    @wire(getNextStep, { reviewProcessId: '$recordId' })
    nextStepHandler(value) {
        this.nextStepResult = value;
        if (value.data) {
            this.nextStep = value.data.name;
            this.messageType = value.data.messageType;
            this.helpText = value.data.helpText;
            this.nextStepStyle = value.data.isReady ? 'color: #6cc230;' : 'color: #c03030;';
        }
    }

    connectedCallback() {
        this.registerErrorListener();
        this.registerSubscribe();
    }

    disconnectedCallback() {
        unsubscribe(this.subscription, () => {
            console.log('Unsubscribed to change events.'); //TODO: Add meaningful log/toast message.
        });
    }

    registerErrorListener() {
        onError(error => {
            console.error('Salesforce error', JSON.stringify(error)); //TODO: Add meaningful log/toast message.
        });
    }

    registerSubscribe() {
        const changeEventCallback = changeEvent => {
            this.processChangeEvent(changeEvent);
        };

        subscribe(this.channelName, -1, changeEventCallback).then(subscription => {
            this.subscription = subscription;
        });
    }

    processChangeEvent(changeEvent) {
        try {
            const recordIds = changeEvent.data.payload.ChangeEventHeader.recordIds;
            if (recordIds.includes(this.recordId)) {
                refreshApex(this.nextStepResult);
            }
        } catch (err) {
            console.error(err); //TODO: Add meaningful log/toast message.
        }
    }

    handleNextStepClick() {
        showToast(
            this,
            this.nextStep,
            this.helpText,
            this.messageType
        );
    }
}