import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { showToast, extractErrorMessage, isEmpty } from 'c/utils';
import getFilteredRecordsForDatatable from '@salesforce/apex/ReviewProcessController.getFilteredRecordsForDatatable';

export default class ReviewProcessRecordsPreview extends LightningModal {
	@api reviewProcessId;
    @api needRefresh;
    @api label;
    @api content;
	@api isConfigPreview;
	@api isTotalRecords;

	@track isLoadingDatatable = false;
	@track isLoading = true;
    @track records = [];
    @track columns;
	@track totalCount;

	connectedCallback() {
		console.log('connectedCallback');
		this.fetchRecords();
	}

	async handleLoadMoreRecords(event) {
		await this.fetchRecords();
	}

	handleBack() {
        this.close('back');
    }

    handleOkay() {
        this.close('okay');
    }

	get closeButtonTitle() {
		return isEmpty(this.isConfigPreview)
			? 'Close'
			: 'Looks Good'
	}

	get contentHtml() {
		return isEmpty(this.isTotalRecords)
			? this.content
			: this.content + ` <span>Number of records that meet your filters: <strong>${this.totalCount}</strong></span>`;
	}

	async fetchRecords() {
		if (this.totalCount === this.records.length) return;

		this.isLoadingDatatable = true;
		await getFilteredRecordsForDatatable({
			reviewProcessId: this.reviewProcessId,
			position: this.records.length,
			needRefresh: this.needRefresh
		}).then(result => {
			if (isEmpty(this.columns)) {
				this.columns = result.columns || [];
			}

			this.records = [...this.records, result.records].flat();
			this.totalCount = result.totalCount || 0;
		}).catch(error => {
			console.log(error);
			showToast(
                this,
                'Unable To Retrieve Records',
                extractErrorMessage(error),
                'error'
            );
		}).finally(() => {
			this.needRefresh = false;
			this.isLoading = false;
			this.isLoadingDatatable = false;
		});
	}
}