import { LightningElement, track } from 'lwc';

import CURRENT_USER_ID from '@salesforce/user/Id';
import getReviewProcesses from '@salesforce/apex/GuiltyAdminController.getReviewProcesses';
import { showToast, isEmpty } from 'c/utils';

const DEFAULT_FETCH_POSITION = 0;
const DEFAULT_FETCH_COUNT = 100;

export default class AdminReviewProcessOverviewer extends LightningElement {
    @track activeTab = 'draft';
    @track activeRecords = [];
    @track passiveTabs = [];

    @track isLoading = false;
    @track recordsOwnership = CURRENT_USER_ID;

    async handleActiveTab(event) {
        this.activeTab = event.target.value;
        this.refs.searchTerm.value = '';

        this.isLoading = true;
        await this.fetchRecordsRange(this.activeTab, false);
        this.isLoading = false;
    }

    handleOwnershipChange(event) {
        let selectedOwnershipOption = event.target.value;
        if (selectedOwnershipOption === 'me') {
            this.recordsOwnership = CURRENT_USER_ID;
        } else {
            this.recordsOwnership = '';
        }

        let activeTab = this.refs[`${this.activeTab}Tab`];
        activeTab.resolveOwnershipQuery(this.recordsOwnership);
    }

    handleSearchClick(event) {
        let input = this.refs.searchTerm;
        let query = input?.value?.trim().toLowerCase() || '';

        let activeTab = this.refs[`${this.activeTab}Tab`];
        activeTab.resolveSearchQuery(query);
    }

    async handleRefreshClick(event) {
        this.isLoading = true;
        await this.fetchRecordsRange(this.activeTab, true);
        this.isLoading = false;
    }

    async fetchRecordsRange(activeTab, isRefresh) {
        let historyTab = this.passiveTabs.find(passiveTab => passiveTab.tab === activeTab);
        if (isEmpty(historyTab)) {
            historyTab = {
                tab: activeTab,
                lastPosition: DEFAULT_FETCH_POSITION,
                lastCount: DEFAULT_FETCH_COUNT
            };

            this.passiveTabs.push(historyTab);
        }

        await getReviewProcesses({
            status: activeTab, 
            fetchPosition: historyTab.lastPosition, 
            fetchCount: historyTab.lastCount, 
            isRefresh: isRefresh
        }).then((data) => {
            this.activeRecords = data;
        });
    }

    get isUnknownState() {
        return isEmpty(this.activeRecords) || this.isLoading === true;
    }

    get unknownStateMessage() {
        return this.isLoading === true 
            ? 'Loading...' 
            : isEmpty(this.activeRecords)
                ? 'No records found'
                : '';
    }
}