import { LightningElement, api } from 'lwc';

import reviewProcessRecordsPreview from 'c/reviewProcessRecordsPreview';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class PreviewReviewProcessAction extends LightningElement {
	@api reviewProcessId;

	@api set recordId(value) {
        this.reviewProcessId = value;
    }

	get recordId() {
        return this.reviewProcessId;
    }

	@api async invoke() {
        await reviewProcessRecordsPreview.open({
			reviewProcessId: this.recordId,
			label: 'Filtered Records Preview',
			size: 'small',
			content: 'You\'re viewing a preview of records based on your current setup. Only fields specified in the filters will be displayed.',
			isConfigPreview: false,
			isTotalRecords: true,
			needRefresh: false
		});

		this.dispatchEvent(new CloseActionScreenEvent());
    }
}