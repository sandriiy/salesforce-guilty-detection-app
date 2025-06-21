import { LightningElement, track, api, wire } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { showToast, isEmpty, extractErrorMessage } from 'c/utils';
import { updateRecord } from 'lightning/uiRecordApi';
import moveReviewProcessToNextStage from '@salesforce/apex/ReviewProcessController.moveReviewProcessToNextStage';
import verifyReadiness from '@salesforce/apex/ReviewProcessController.verifyReviewProcessReadiness';

const NEXT_STATUS = 'Pending';
export default class SubmitReviewProcessAction extends LightningElement {
    @track isLoading = true;
    @track isError;
    @track errorList = [];

    @api set recordId(value) {
        this.reviewProcessId = value;
        this.checkReadiness();
    }

    get recordId() {
        return this.reviewProcessId;
    }

    handleClose(event) {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleSubmit(event) {
        await moveReviewProcessToNextStage({ reviewProcessId: this.recordId, newStatus: NEXT_STATUS })
            .then((data) => {
                showToast(
                    this,
                    'Review Process Successfully Submitted',
                    'Review Process has been moved to the "Pending" status and will start as scheduled',
                    'success'
                );
            })
            .catch((error) => {
                console.error(error);
                showToast(
                    this,
                    'Unable to Submit Review Process',
                    extractErrorMessage(error),
                    'error'
                );
            });

        await updateRecord({ fields: { Id: this.recordId }})
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    checkReadiness() {
        verifyReadiness({ reviewProcessId: this.recordId })
            .then((data) => {
                if (isEmpty(data)) {
                    this.isError = false;
                    this.errorList = [];
                } else {
                    this.isError = true;
                    this.errorList = data;
                }
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}