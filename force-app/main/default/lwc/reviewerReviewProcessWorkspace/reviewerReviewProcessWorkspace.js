import { LightningElement, wire, track } from 'lwc';
import Id from '@salesforce/user/Id';

import { refreshApex } from '@salesforce/apex';
import { showToast, isEmpty } from 'c/utils';

import FeedbackRecordModal from 'c/reviewerFeedbackRecordModal';
import getReviewProcesses from '@salesforce/apex/GuiltyReviewerController.getOngoingReviewProcesses';
import beginNewFeedbackProcess from '@salesforce/apex/GuiltyReviewerController.beginNewFeedbackProcessByReviewId';

export default class ReviewerReviewProcessWorkspace extends LightningElement {
    @track reviewProcesses = [];
    @track isLoading = true;
    @track searchTerm = '';
    userId = Id;
    
    wiredReviewsRef;
    @wire(getReviewProcesses, { userId: "$userId" })
    wiredReviews(result) {
        this.wiredReviewsRef = result;
        const { data, error } = result;

        if (data) {
            this.reviewProcesses = this.prepareReviewProcesses(data);
            this.isLoading = false;
        } else if (error) {
            // toast
            this.isLoading = false;
        }
    }

    handleSearch(event) {
        this.searchTerm = (event.target.value || '').toLowerCase();
    }

    async handleRefreshClick(event) {
        this.isLoading = true;
        await refreshApex(this.wiredReviewsRef);
        this.isLoading = false;
    }

    async handleNewReviewClick(event) {
		let buttonTarget = event.currentTarget;
        const reviewProcessId = buttonTarget.dataset.id;

        this.isLoading = true;
        let reviewFeedback;
        await beginNewFeedbackProcess({ reviewProcessId: reviewProcessId })
            .then(result => {
				reviewFeedback = result;

				if (isEmpty(result)) {
					showToast(
						this,
						'There are no more records to review',
						'All records are either reviewed or currently in review. Just double-check that you don\’t have any pending reviews left',
						'success'
					);
				}
            })
            .catch(error => {
                console.log(error);
				showToast(
					this,
					'Unable to Retrieve Record For Review',
					'Please contact your System Administrator or try again later',
					'error'
				);
            });

		if (!isEmpty(reviewFeedback)) {
			await FeedbackRecordModal.open({
				feedbackId: reviewFeedback.Id
			});

			await refreshApex(this.wiredReviewsRef);
		} else {
			buttonTarget.disabled = true;
		}

        this.isLoading = false;
    }

	async handleContinueReview(event) {
		const reviewFeedbackId = event.currentTarget.dataset.id;
		this.isLoading = true;

		await FeedbackRecordModal.open({
            feedbackId: reviewFeedbackId
        });

		await refreshApex(this.wiredReviewsRef);
        this.isLoading = false;
	}

    prepareReviewProcesses(data) {
        return data.map(process => {
            const formattedDate = this.convertToReadableDate(process.EndDateTime__c);
            const allFeedbacks = process.Review_Feedback__r || [];
            const unreviewedFeedbacks = allFeedbacks.filter(feedback => feedback.isReviewed__c === false);
            const reviewedCount = allFeedbacks.filter(feedback => feedback.isReviewed__c === true).length;

            return {
                Id: process.Id,
                Name: process.Name,
                endDateLabel: `By ${formattedDate}`,
                totalRecords: process.TotalReviewableRecords__c,
                completedFeedback: reviewedCount,
                feedbacks: unreviewedFeedbacks
            };
        });
    }

    convertToReadableDate(datetime) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(datetime));
    }

    get filteredProcesses() {
        if (!this.searchTerm) {
            return this.reviewProcesses;
        }

        return this.reviewProcesses.filter(proc => {
            const processMatch = (proc.Name || '').toLowerCase().includes(this.searchTerm) 
                || (proc.endDateLabel || '').toLowerCase().includes(this.searchTerm);

            const feedbacks = proc.feedbacks || [];
            const feedbackMatch = feedbacks.some(fd =>
                ((fd.Name || '').toLowerCase().includes(this.searchTerm)) ||
                ((fd.RecordType__c || '').toLowerCase().includes(this.searchTerm))
            );

            return processMatch || feedbackMatch;
        });
    }
}