import { LightningElement, track } from 'lwc';

const ALL_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'utility:metrics' },
    { id: 'overview', label: 'Overview', icon: 'utility:snippet' }
];

export default class AdminReviewProcessSummarizer extends LightningElement {
    @track selectedGuiltyTab = 'overview';

    handleTabClick(event) {
        let tabId = event.currentTarget.dataset.id;
        this.selectedGuiltyTab = tabId;
    }

    get tabs() {
        return ALL_TABS.map(tab => {
            return {
                ...tab,
                computedClass: tab.id === this.selectedGuiltyTab ? 'summarizer-sidebar-active' : ''
            };
        });
    }

    get isDashboard() {
        return this.selectedGuiltyTab === 'dashboard';
    }

    get isOverview() {
        return this.selectedGuiltyTab === 'overview';
    }
}