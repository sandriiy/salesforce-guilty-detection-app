import { createElement } from 'lwc';
import AdminReviewProcessDashboard from 'c/adminReviewProcessDashboard';

import getAccessibleSObjects from '@salesforce/apex/GuiltyAdminController.getAccessibleSObjects';
import getChartAnalyticsContext from '@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext';
import getChartDataset from '@salesforce/apex/GuiltyAdminController.getChartDataset';
import getReviewTotals from '@salesforce/apex/GuiltyAdminController.getReviewTotals';
import getStatusCounts from '@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts';
import { loadScript } from 'lightning/platformResourceLoader';

jest.mock('lightning/platformResourceLoader', () => {
    return {
        loadScript: jest.fn()
    };
}, { virtual: true });

jest.mock('@salesforce/resourceUrl/ChartJsLibrary', () => 'chartjs', { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getAccessibleSObjects', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getChartDataset', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getChartFieldPicklistValues', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getReviewTotals', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts', () => ({ default: jest.fn() }), { virtual: true });

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const analyticsContext = {
    baseObjectApiName: 'ReviewProcess__c',
    baseObjectLabel: 'Review Process',
    selectedRelationshipPath: 'SELF::ReviewProcess__c',
    selectedSourceObjectApiName: 'ReviewProcess__c',
    defaultGroupByFieldApiName: 'Status__c',
    defaultAggregationType: 'COUNT',
    defaultChartType: 'bar',
    relationshipPaths: [
        {
            value: 'SELF::ReviewProcess__c',
            label: 'Review Process',
            description: 'Review processes from the selected base object.',
            sourceObjectApiName: 'ReviewProcess__c',
            sourceObjectLabel: 'Review Process',
            relationshipType: 'SELF',
            usesIdReference: false
        },
        {
            value: 'IDREF::ReviewFeedback__c::RecordId__c',
            label: 'Review Feedback via Record Identifier',
            description: 'Review feedback records linked through a text-based Salesforce ID field.',
            sourceObjectApiName: 'ReviewFeedback__c',
            sourceObjectLabel: 'Review Feedback',
            relationshipType: 'ID_REFERENCE',
            usesIdReference: true
        }
    ],
    groupByFields: [
        { label: 'Status', name: 'Status__c', type: 'PICKLIST', referenceTo: null }
    ],
    baseFilterableFields: [
        { label: 'Status', name: 'Status__c', type: 'PICKLIST', referenceTo: null }
    ],
    filterableFields: [
        { label: 'Assessment', name: 'Assessment__c', type: 'PICKLIST', referenceTo: null }
    ],
    aggregationFields: [
        { label: 'Negative Feedback', name: 'NegativeFeedbackTotal__c', type: 'INTEGER', referenceTo: null }
    ],
    availableChartTypes: [
        { label: 'Bar', value: 'bar' },
        { label: 'Doughnut', value: 'doughnut' }
    ],
    aggregationTypes: [
        { label: 'Count', value: 'COUNT' },
        { label: 'Sum', value: 'SUM' }
    ]
};

const analyticsDataset = {
    labels: ['Draft', 'Completed'],
    datasets: [
        { label: 'Count of Review Process', values: [2, 3] }
    ],
    chartType: 'bar',
    groupByFieldApiName: 'Status__c',
    groupByFieldLabel: 'Status',
    aggregationType: 'COUNT',
    aggregationFieldApiName: null,
    sourceObjectApiName: 'ReviewProcess__c',
    sourceObjectLabel: 'Review Process',
    relationshipPathValue: 'SELF::ReviewProcess__c',
    relationshipPathLabel: 'Review Process',
    usesIdReference: false,
    warnings: []
};

describe('c-admin-review-process-dashboard', () => {
    beforeEach(() => {
        loadScript.mockResolvedValue();
        getReviewTotals.mockResolvedValue({
            ReviewProcessTotal: 5,
            ReviewFeedbackTotal: 8,
            ReviewRecordsTotal: 13
        });
        getStatusCounts.mockResolvedValue({ Draft: 2, Completed: 3 });
        getAccessibleSObjects.mockResolvedValue([
            { label: 'Account', value: 'Account' },
            { label: 'Review Process', value: 'ReviewProcess__c' }
        ]);
        getChartAnalyticsContext.mockResolvedValue(analyticsContext);
        getChartDataset.mockResolvedValue(analyticsDataset);

        window.Chart = jest.fn().mockImplementation(() => ({
            destroy: jest.fn()
        }));
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }

        jest.clearAllMocks();
        delete window.Chart;
    });

    it('loads summary totals, analytics controls, and renders both charts', async () => {
        const element = createElement('c-admin-review-process-dashboard', {
            is: AdminReviewProcessDashboard
        });

        document.body.appendChild(element);
        await flushPromises();
        await flushPromises();
        await flushPromises();

        const totals = [...element.shadowRoot.querySelectorAll('.slds-text-heading_large')].map((node) => node.textContent.trim());
        expect(totals).toEqual(['5', '8', '13']);

        const baseObjectInput = element.shadowRoot.querySelector('lightning-combobox[data-id="baseObject"]');
        const relationshipInput = element.shadowRoot.querySelector('lightning-combobox[data-id="relationshipPath"]');
        expect(baseObjectInput.value).toBe('ReviewProcess__c');
        expect(relationshipInput.value).toBe('SELF::ReviewProcess__c');

        expect(loadScript).toHaveBeenCalledTimes(1);
        expect(getChartAnalyticsContext).toHaveBeenCalledTimes(1);
        expect(getChartDataset).toHaveBeenCalledTimes(1);
        expect(window.Chart).toHaveBeenCalledTimes(2);
    });
});