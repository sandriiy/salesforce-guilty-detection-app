import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { showToast, isEmpty } from 'c/utils';
import { refreshApex } from '@salesforce/apex';
import getFilteredRecordsForDatatable from '@salesforce/apex/ReviewProcessController.getFilteredRecordsForDatatable';

export default class ReviewProcessRecordsPreview extends LightningModal {
	@api reviewProcessId;
    @api filters;
    @api label;
    @api content;
	@api isConfigPreview;
	@api isTotalRecords;

	@track isLoading = true;
	@track searchQuery;
    @track records = [];
    @track columns;

	wiredRecordsResult;
	@wire(getFilteredRecordsForDatatable, { reviewProcessId: '$reviewProcessId' })
	wiredInfo(value) {
		this.wiredRecordsResult = value;
		refreshApex(this.wiredRecordsResult);

		const { data, error } = value || {};
		this.loading = false;

		if (data) {
			this.columns = data.columns;
			this.records = data.records;
			this.isLoading = false;
		} else if (error) {
			this.isLoading = false;
			console.log(error);
			showToast(
                this,
                'Unable To Retrieve Records',
                'Please try again or contact your System Administrator',
                'error'
            );
		}
	}

    handleSearchChange(event) {
		const value = event.target.value;
  		this.searchQuery = value;
	}

    get totalCount() {
        return this.records.length;
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

	get filterRecords() {
		const optimizedQuery = (this.searchQuery || '').replace(/\s+/g, '').toLowerCase();
		if (!optimizedQuery) return this.records;

		let filteredRecords = this.records.filter((row) =>
			Object.entries(row).some(([key, value]) => {
				const type = typeof value;
				if (type === 'string' || type === 'number' || type === 'boolean') {
					return String(value).replace(/\s+/g, '').toLowerCase().includes(optimizedQuery);
				}

				return false;
			})
		);

		return isEmpty(filteredRecords) ? undefined : filteredRecords;
	};

    handleBack() {
        this.close('back');
    }

    handleOkay() {
        this.close('okay');
    }
}