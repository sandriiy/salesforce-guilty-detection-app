import { LightningElement, track } from 'lwc';

const ALL_TABS = [
    { id: 'overview', label: 'Overview', icon: 'utility:identity' },
    { id: 'workspace', label: 'Workspace', icon: 'utility:questions_and_answers' }
];

export default class ReviewerReviewProcessSummarizer extends LightningElement {
    @track selectedTab = 'workspace';
    
    handleTabClick(event) {
        let tabId = event.currentTarget.dataset.id;
        this.selectedTab = tabId;
    }

    get tabs() {
        return ALL_TABS.map(tab => {
            return {
                ...tab,
                computedClass: tab.id === this.selectedTab ? 'summarizer-sidebar-active' : ''
            };
        });
    }

    get isWorkspace() {
        return this.selectedTab === 'workspace';
    }

    get isOverview() {
        return this.selectedTab === 'overview';
    }
}