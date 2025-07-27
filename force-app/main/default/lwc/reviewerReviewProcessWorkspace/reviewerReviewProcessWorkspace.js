import { LightningElement, wire, track } from 'lwc';
import Id from '@salesforce/user/Id';
import { refreshApex } from '@salesforce/apex';
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
        const reviewProcessId = event.currentTarget.dataset.id;

        this.isLoading = true;
        let reviewFeedback;
        await beginNewFeedbackProcess({ reviewProcessId: reviewProcessId })
            .then(result => {
                console.log(result);
                reviewFeedback = result;
            })
            .catch(error => {
                console.log(error);
            });

        const result = await FeedbackRecordModal.open({
            feedbackId: reviewFeedback.Id
        });

        // ...

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