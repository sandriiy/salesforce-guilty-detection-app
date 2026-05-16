import { createElement } from '@lwc/engine-dom';
import DynamicChartBuilder from 'c/dynamicChartBuilder';

jest.mock(
    '@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext',
    () => jest.fn(),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/GuiltyAdminController.getChartDataset',
    () => jest.fn(),
    { virtual: true }
);
jest.mock('@salesforce/resourceUrl/ChartJsLibrary', () => '@salesforce/resourceUrl/ChartJsLibrary', {
    virtual: true
});

describe('c-dynamic-chart-builder', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders without error when no baseObjectApiName is set', () => {
        const element = createElement('c-dynamic-chart-builder', { is: DynamicChartBuilder });
        document.body.appendChild(element);
        expect(element).toBeTruthy();
    });

    it('calls getChartAnalyticsContext when baseObjectApiName is set', async () => {
        const getChartAnalyticsContext = require('@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext');
        getChartAnalyticsContext.mockResolvedValue({
            baseObjectApiName: 'ReviewProcess__c',
            baseObjectLabel: 'Review Process',
            availableRelationshipPaths: [],
            availableChartTypes: [{ label: 'Bar', value: 'bar' }]
        });

        const element = createElement('c-dynamic-chart-builder', { is: DynamicChartBuilder });
        document.body.appendChild(element);

        element.baseObjectApiName = 'ReviewProcess__c';

        await Promise.resolve();

        expect(getChartAnalyticsContext).toHaveBeenCalledWith({
            baseObjectApiName: 'ReviewProcess__c'
        });
    });

    it('resets state when baseObjectApiName changes', async () => {
        const getChartAnalyticsContext = require('@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext');
        getChartAnalyticsContext.mockResolvedValue({
            baseObjectApiName: 'Account',
            baseObjectLabel: 'Account',
            availableRelationshipPaths: [],
            availableChartTypes: []
        });

        const element = createElement('c-dynamic-chart-builder', { is: DynamicChartBuilder });
        document.body.appendChild(element);

        element.baseObjectApiName = 'ReviewProcess__c';
        await Promise.resolve();

        element.baseObjectApiName = 'Account';
        await Promise.resolve();

        expect(getChartAnalyticsContext).toHaveBeenCalledTimes(2);
    });
});
