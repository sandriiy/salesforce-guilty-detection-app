import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

import { isEmpty } from 'c/utils';

import draftTemplate from "./templateDraftTab.html";
import pendingTemplate from "./templatePendingTab.html";
import ongoingTemplate from "./templateOngoingTab.html";
import completedTemplate from "./templateCompletedTab.html";

const TEMPLATE_MAP = {
    draft: draftTemplate,
    pending: pendingTemplate,
    ongoing: ongoingTemplate,
    completed: completedTemplate
};

export default class AdminReviewProcessOverviewerTab extends NavigationMixin(LightningElement) {
    @api activeTab;
    @api records;
    @api ownershipId;

    @track searchTerm = '';

    @api resolveSearchQuery(searchTerm) {
        let term = searchTerm?.toLowerCase() || '';
        this.searchTerm = term;
    }

    @api resolveOwnershipQuery(ownerId) {
        this.ownershipId = ownerId;
    }

    render() {
        return TEMPLATE_MAP[this.activeTab] || draftTemplate;
    }

    handleViewClick(event) {
        const closest = event.target.closest('[data-id]');
        const recordId = closest.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'ReviewProcess__c',
                actionName: 'view'
            }
        });
    }

    get filteredRecords() {
        let filtered = this.records;

        // Filter by ownership if it's defined
        if (!isEmpty(this.ownershipId)) {
            filtered = filtered.filter(record => record.OwnerId === this.ownershipId);
        }

        // Filter by search if it's it's defined
        if (!isEmpty(this.searchTerm)) {
            const searchTerm = this.searchTerm.toLowerCase();
            filtered = filtered.filter(record =>
                (record.Name || '').toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }
}