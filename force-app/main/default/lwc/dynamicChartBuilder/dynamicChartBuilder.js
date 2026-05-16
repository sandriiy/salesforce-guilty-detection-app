import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { showToast } from 'c/utils';
import ChartBuilder from 'c/chartUtils';
import chartjs from '@salesforce/resourceUrl/ChartJsLibrary';
import getChartAnalyticsContext from '@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext';
import getChartDataset from '@salesforce/apex/GuiltyAdminController.getChartDataset';

const AGGREGATION_TYPE_OPTIONS = [
    { label: 'Count', value: 'COUNT' },
    { label: 'Sum', value: 'SUM' },
    { label: 'Average', value: 'AVG' }
];

const NUMERIC_FIELD_TYPES = new Set(['INTEGER', 'DOUBLE', 'CURRENCY', 'PERCENT']);

export default class DynamicChartBuilder extends LightningElement {
    @api
    get baseObjectApiName() {
        return this._baseObjectApiName;
    }
    set baseObjectApiName(value) {
        this._baseObjectApiName = value;
        if (value) {
            this.resetState();
            this.loadContext();
        }
    }

    _baseObjectApiName;
    @track context;
    @track selectedPathKey;
    @track selectedGroupByField;
    @track aggregationType = 'COUNT';
    @track selectedAggregationField;
    @track selectedChartType = 'bar';
    @track isLoadingContext = false;
    @track isLoadingDataset = false;
    @track contextErrorMessage;
    @track datasetErrorMessage;
    @track hasChartRendered = false;

    chartJsLoaded = false;
    chartInstance;

    connectedCallback() {
        if (window.Chart) {
            this.chartJsLoaded = true;
            return;
        }
        loadScript(this, chartjs)
            .then(() => {
                this.chartJsLoaded = true;
            })
            .catch(() => {
                showToast(this, 'Chart Library Unavailable', 'Chart.js could not be loaded.', 'error');
            });
    }

    disconnectedCallback() {
        this.destroyChartInstance();
    }

    get isLoading() {
        return this.isLoadingContext || this.isLoadingDataset;
    }

    get hasContextLoadError() {
        return !!this.contextErrorMessage && !this.isLoadingContext;
    }

    get hasDatasetError() {
        return !!this.datasetErrorMessage && !this.isLoadingDataset;
    }

    get isContextReady() {
        return !!this.context && !this.isLoadingContext && !this.contextErrorMessage;
    }

    get hasSelectedPath() {
        return !!this.selectedPathKey && !!this.context;
    }

    get isGenerateDisabled() {
        return !this.selectedGroupByField
            || this.isLoading
            || (this.showAggregationField && !this.selectedAggregationField);
    }

    get showAggregationField() {
        return this.hasSelectedPath && (this.aggregationType === 'SUM' || this.aggregationType === 'AVG');
    }

    get chartContainerClass() {
        return this.hasChartRendered ? 'chart-container' : 'chart-container slds-hide';
    }

    get pathOptions() {
        if (!this.context || !this.context.availableRelationshipPaths) return [];
        return this.context.availableRelationshipPaths.map(path => ({
            label: path.label,
            value: path.key
        }));
    }

    get groupByFieldOptions() {
        const selectedPath = this.resolveSelectedPath();
        if (!selectedPath || !selectedPath.availableGroupByFields) return [];
        return selectedPath.availableGroupByFields.map(field => ({
            label: field.label,
            value: field.name
        }));
    }

    get aggregationFieldOptions() {
        const selectedPath = this.resolveSelectedPath();
        if (!selectedPath || !selectedPath.availableGroupByFields) return [];
        return selectedPath.availableGroupByFields
            .filter(f => NUMERIC_FIELD_TYPES.has((f.type || '').toUpperCase()))
            .map(field => ({ label: field.label, value: field.name }));
    }

    get chartTypeOptions() {
        if (!this.context || !this.context.availableChartTypes) return [];
        return this.context.availableChartTypes.map(ct => ({
            label: ct.label,
            value: ct.value
        }));
    }

    get aggregationTypeOptions() {
        return AGGREGATION_TYPE_OPTIONS;
    }

    handlePathChange(event) {
        this.selectedPathKey = event.detail.value;
        this.selectedGroupByField = null;
        this.selectedAggregationField = null;
        this.datasetErrorMessage = null;
        this.destroyChartInstance();
        this.hasChartRendered = false;
    }

    handleGroupByChange(event) {
        this.selectedGroupByField = event.detail.value;
    }

    handleAggregationTypeChange(event) {
        this.aggregationType = event.detail.value;
        this.selectedAggregationField = null;
    }

    handleAggregationFieldChange(event) {
        this.selectedAggregationField = event.detail.value;
    }

    handleChartTypeChange(event) {
        this.selectedChartType = event.detail.value;
    }

    handleGenerateChart() {
        const selectedPath = this.resolveSelectedPath();
        if (!selectedPath) return;

        const chartRequest = {
            baseObjectApiName: this._baseObjectApiName,
            sourceObjectApiName: selectedPath.sourceObjectApiName,
            relationshipPathKey: this.selectedPathKey,
            groupByFieldApiName: this.selectedGroupByField,
            aggregationType: this.aggregationType,
            aggregationFieldApiName: this.selectedAggregationField,
            chartType: this.selectedChartType,
            recordLimit: 200
        };

        this.isLoadingDataset = true;
        this.datasetErrorMessage = null;
        this.destroyChartInstance();
        this.hasChartRendered = false;

        getChartDataset({ requestJson: JSON.stringify(chartRequest) })
            .then(response => {
                this.isLoadingDataset = false;
                if (response.warnings && response.warnings.length > 0) {
                    this.datasetErrorMessage = response.warnings.join('; ');
                    return;
                }
                if (!response.labels || response.labels.length === 0) {
                    this.datasetErrorMessage = 'No data found for the selected configuration.';
                    return;
                }
                this.hasChartRendered = true;
                this.renderChart(response);
            })
            .catch(error => {
                this.isLoadingDataset = false;
                this.datasetErrorMessage = (error && error.body && error.body.message)
                    ? error.body.message
                    : 'Failed to generate chart.';
            });
    }

    renderChart(response) {
        if (!window.Chart) {
            showToast(this, 'Chart.js Not Ready', 'Please refresh the page and try again.', 'error');
            return;
        }

        const canvas = this.template.querySelector('canvas.dynamic-chart-canvas');
        if (!canvas) return;

        this.destroyChartInstance();

        const firstDataset = response.datasets[0];
        const chartTitle = this.buildChartTitle(response);

        const chartConfig = new ChartBuilder(response.chartType || 'bar')
            .setLabels(response.labels)
            .addDataset({
                label: firstDataset.label,
                data: firstDataset.data,
                backgroundColor: firstDataset.backgroundColor
            })
            .setLegend('bottom')
            .setTitle(chartTitle)
            .setResponsive(true)
            .setMaintainAspectRatio(false)
            .setLayoutPadding(0)
            .build();

        this.chartInstance = new window.Chart(canvas, chartConfig);
    }

    buildChartTitle(response) {
        const selectedPath = this.resolveSelectedPath();
        const sourceLabel = selectedPath ? selectedPath.sourceObjectLabel : '';
        const groupByLabel = response.groupByFieldLabel || this.selectedGroupByField || '';
        return sourceLabel + ' by ' + groupByLabel;
    }

    loadContext() {
        if (!this._baseObjectApiName) return;
        this.isLoadingContext = true;
        this.contextErrorMessage = null;

        getChartAnalyticsContext({ baseObjectApiName: this._baseObjectApiName })
            .then(result => {
                this.context = result;
                this.isLoadingContext = false;
            })
            .catch(error => {
                this.contextErrorMessage = (error && error.body && error.body.message)
                    ? error.body.message
                    : 'Failed to load analytics context.';
                this.isLoadingContext = false;
            });
    }

    resetState() {
        this.context = null;
        this.selectedPathKey = null;
        this.selectedGroupByField = null;
        this.aggregationType = 'COUNT';
        this.selectedAggregationField = null;
        this.selectedChartType = 'bar';
        this.contextErrorMessage = null;
        this.datasetErrorMessage = null;
        this.hasChartRendered = false;
        this.destroyChartInstance();
    }

    resolveSelectedPath() {
        if (!this.context || !this.selectedPathKey) return null;
        return this.context.availableRelationshipPaths.find(p => p.key === this.selectedPathKey) || null;
    }

    destroyChartInstance() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}
