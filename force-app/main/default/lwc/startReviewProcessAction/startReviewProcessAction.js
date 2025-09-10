import { LightningElement, track, api } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { showToast, extractErrorMessage } from 'c/utils';
import { updateRecord } from 'lightning/uiRecordApi';
import moveReviewProcessToNextStage from '@salesforce/apex/ReviewProcessController.moveReviewProcessToNextStage';

const NEXT_STATUS = 'Ongoing';
export default class StartReviewProcessAction extends LightningElement {
    @api reviewProcessId;
    @track isLoading = false;

    @api set recordId(value) {
        this.reviewProcessId = value;
    }

    get recordId() {
        return this.reviewProcessId;
    }

    handleClose(event) {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleStart(event) {
        this.isLoading = true;
        await moveReviewProcessToNextStage({ reviewProcessId: this.recordId, newStatus: NEXT_STATUS })
            .then((data) => {
                showToast(
                    this,
                    'Review Process Successfully Started',
                    'Review Process has been moved to the "Ongoing" status and is ready for reviewers',
                    'success'
                );
            })
            .catch((error) => {
                console.error(error);
                showToast(
                    this,
                    'Unable to Start Review Process',
                    extractErrorMessage(error),
                    'error'
                );
            });

        await updateRecord({ fields: { Id: this.recordId }});
        this.isLoading = false;
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}