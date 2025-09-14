import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { showToast, isEmpty } from 'c/utils';
import { refreshApex } from '@salesforce/apex';

import { getIfUnchanged, save } from 'c/datatableCache';
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
	@track totalCount;

	async connectedCallback() {
		this.isLoading = true;

		const cached = await getIfUnchanged(JSON.parse(this.filters));
		if (cached) {
			this.columns = cached.columns;
			this.records = cached.records;
			this.totalCount = cached.totalCount ?? 0;
			this.isLoading = false;
		} else {
			await this.refreshFromServer();
		}
	}

	async refreshFromServer() {
		try {
			const result = await getFilteredRecordsForDatatable({
				reviewProcessId: this.reviewProcessId,
			});
			
			this.columns = result.columns || [];
			this.records = result.records || [];
			this.totalCount = result.totalCount || 0;

			await save(JSON.parse(this.filters), {
				columns: this.columns,
				records: this.records,
				totalCount: this.totalCount
			});
		} finally {
			this.isLoading = false;
		}
	}

    handleSearchChange(event) {
		const value = event.target.value;
  		this.searchQuery = value;
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