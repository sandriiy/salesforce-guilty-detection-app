import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import {
    BOOLEAN_AS_PICKLIST_VALUES,
    extractErrorMessage,
    getFieldTypeConditions,
    getFieldTypeForInput,
    showToast,
    STATUSES_GRAPH_COLOR_MAP
} from 'c/utils';
import {
    autoUpdateFilterLogic,
    recalculateFilterLogic,
    validateFilterLogic,
    validateFilterLogicStructure
} from 'c/filterLogicUtils';

import getAccessibleSObjects from '@salesforce/apex/GuiltyAdminController.getAccessibleSObjects';
import getChartAnalyticsContext from '@salesforce/apex/GuiltyAdminController.getChartAnalyticsContext';
import getChartDataset from '@salesforce/apex/GuiltyAdminController.getChartDataset';
import getChartFieldPicklistValues from '@salesforce/apex/GuiltyAdminController.getChartFieldPicklistValues';
import getReviewTotals from '@salesforce/apex/GuiltyAdminController.getReviewTotals';
import getStatusCounts from '@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts';

import chartjs from '@salesforce/resourceUrl/ChartJsLibrary';
import ChartBuilder from 'c/chartUtils';

const STATUS_GRAPH = {
    id: 'status-graph',
    title: 'Review Processes By Status'
};

const ANALYTICS_GRAPH = {
    id: 'analytics-graph',
    title: 'Review Process Analytics'
};

const DEFAULT_BASE_OBJECT_API_NAME = 'ReviewProcess__c';
const DEFAULT_RESULT_LIMIT = 12;
const MAX_RESULT_LIMIT = 25;
const CHART_PALETTE = [
    '#0b6fb8',
    '#2e844a',
    '#f59f00',
    '#c23934',
    '#7f5af0',
    '#0097a7',
    '#ff784f',
    '#5c6bc0',
    '#8e24aa',
    '#43a047',
    '#546e7a',
    '#ef6c00'
];
const GRID_CHART_TYPES = new Set(['bar', 'line']);
const RADIAL_CHART_TYPES = new Set(['radar']);
const FILTER_SECTIONS = {
    base: {
        fieldOptionsProperty: 'baseFilterFieldOptions',
        filtersProperty: 'baseFilters',
        label: 'Base record',
        logicProperty: 'baseFilterLogic',
        logicValidityProperty: 'baseFilterLogicValidity',
        objectApiNameProperty: 'selectedBaseObjectApiName'
    },
    dataset: {
        fieldOptionsProperty: 'datasetFilterFieldOptions',
        filtersProperty: 'datasetFilters',
        label: 'Dataset',
        logicProperty: 'datasetFilterLogic',
        logicValidityProperty: 'datasetFilterLogicValidity',
        objectApiNameProperty: 'selectedSourceObjectApiName'
    }
};

function clampResultLimit(value) {
    const numericValue = parseInt(value, 10);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
        return DEFAULT_RESULT_LIMIT;
    }

    return Math.min(numericValue, MAX_RESULT_LIMIT);
}

function createFilterState(id) {
    return {
        conditions: [],
        field: '',
        id,
        isDisabledConditions: true,
        isDisabledValue: true,
        isLookup: false,
        isPicklist: false,
        lookupTo: '',
        options: [],
        selectedCondition: '',
        type: 'text',
        value: ''
    };
}

function filterNeedsValue(selectedCondition) {
    return selectedCondition !== 'isNull';
}

function normalizeFieldType(fieldType) {
    return String(fieldType || '').toUpperCase();
}

function resolveInputType(fieldDto) {
    const normalizedFieldType = normalizeFieldType(fieldDto?.type);
    if ((normalizedFieldType === 'ID' || normalizedFieldType === 'REFERENCE') && !fieldDto?.referenceTo) {
        return 'text';
    }

    return getFieldTypeForInput(normalizedFieldType);
}

function toOptionList(values = []) {
    return (values || []).map((value) => ({
        label: value.label,
        value: value.value
    }));
}

function withAlpha(hexColor, alpha = '33') {
    if (!hexColor || hexColor.length !== 7 || !hexColor.startsWith('#')) {
        return hexColor;
    }

    return `${hexColor}${alpha}`;
}

export default class AdminReviewProcessDashboard extends LightningElement {
    totalReviews = 0;
    totalFeedback = 0;
    totalRecords = 0;

    analyticsContext;
    analyticsErrorMessage = '';
    analyticsResponse;
    aggregationFieldOptions = [];
    aggregationTypeOptions = [];
    baseFilterFieldOptions = [];
    baseFilters = [];
    baseFilterLogic = '';
    baseFilterLogicValidity = true;
    baseObjectOptions = [];
    chartJsLoadPromise;
    chartTypeOptions = [];
    dashboardInitPromise;
    datasetFilterFieldOptions = [];
    datasetFilters = [];
    datasetFilterLogic = '';
    datasetFilterLogicValidity = true;
    filterSequence = 0;
    groupByOptions = [];
    isChartJsLoaded = false;
    isInitializing = false;
    isLoadingContext = false;
    isRefreshingAnalytics = false;
    relationshipPathOptions = [];
    resultLimit = DEFAULT_RESULT_LIMIT;
    selectedAggregationFieldApiName;
    selectedAggregationType = 'COUNT';
    selectedBaseObjectApiName = DEFAULT_BASE_OBJECT_API_NAME;
    selectedChartType = 'bar';
    selectedGroupByFieldApiName;
    selectedRelationshipPath;
    selectedSourceObjectApiName = DEFAULT_BASE_OBJECT_API_NAME;
    statusChart;
    statusSummaryData;
    analyticsChart;

    connectedCallback() {
        if (!this.dashboardInitPromise) {
            this.dashboardInitPromise = this.initializeDashboardData();
        }
    }

    renderedCallback() {
        if (!this.chartJsLoadPromise) {
            this.chartJsLoadPromise = loadScript(this, chartjs)
                .then(() => {
                    this.isChartJsLoaded = true;
                    this.renderStatusChart();
                    this.renderAnalyticsChart();
                })
                .catch((error) => {
                    this.notifyError('Unable To Load Chart Library', error);
                });
        }
    }

    disconnectedCallback() {
        this.destroyChart('statusChart');
        this.destroyChart('analyticsChart');
    }

    async handleBaseObjectChange(event) {
        this.selectedBaseObjectApiName = event.detail.value;
        this.selectedRelationshipPath = this.getSelfRelationshipPathValue();
        this.selectedSourceObjectApiName = this.selectedBaseObjectApiName;
        this.selectedGroupByFieldApiName = null;
        this.selectedAggregationFieldApiName = null;
        this.analyticsResponse = null;
        this.clearFilterSet('base');
        this.clearFilterSet('dataset');

        try {
            await this.loadAnalyticsContext(this.getSelfRelationshipPathValue());
            await this.refreshAnalyticsDataset(false);
        } catch (error) {
        }
    }

    async handleRelationshipPathChange(event) {
        this.selectedRelationshipPath = event.detail.value;
        this.selectedGroupByFieldApiName = null;
        this.selectedAggregationFieldApiName = null;
        this.analyticsResponse = null;
        this.clearFilterSet('dataset');

        try {
            await this.loadAnalyticsContext(this.selectedRelationshipPath);
            await this.refreshAnalyticsDataset(false);
        } catch (error) {
        }
    }

    handleGroupByFieldChange(event) {
        this.selectedGroupByFieldApiName = event.detail.value;
    }

    handleAggregationTypeChange(event) {
        this.selectedAggregationType = event.detail.value;
        if (!this.shouldShowAggregationField) {
            this.selectedAggregationFieldApiName = null;
            return;
        }

        this.selectedAggregationFieldApiName = this.resolveSelectedOptionValue(
            this.aggregationFieldOptions,
            this.selectedAggregationFieldApiName,
            this.aggregationFieldOptions[0]?.value
        );
    }

    handleAggregationFieldChange(event) {
        this.selectedAggregationFieldApiName = event.detail.value;
    }

    handleChartTypeChange(event) {
        this.selectedChartType = event.detail.value;
        if (this.analyticsResponse) {
            this.analyticsResponse = {
                ...this.analyticsResponse,
                chartType: this.selectedChartType
            };
            this.renderAnalyticsChart();
        }
    }

    handleResultLimitChange(event) {
        this.resultLimit = clampResultLimit(event.detail.value || event.target.value);
    }

    handleAddFilter(event) {
        const filterKind = event.target.dataset.filterKind;
        const filters = [...this.getFilters(filterKind), createFilterState(`${filterKind}-${this.filterSequence++}`)];
        this.setFilters(filterKind, filters);
        this.setFilterLogic(filterKind, autoUpdateFilterLogic(this.getFilterLogic(filterKind), filters.length - 1));
        this.setFilterLogicValidity(filterKind, true);
        this.applyLogicValidity(filterKind, '');
    }

    handleRemoveFilter(event) {
        const filterKind = event.target.dataset.filterKind;
        const filterIndex = parseInt(event.target.dataset.filterIndex, 10);
        const filters = [...this.getFilters(filterKind)];
        filters.splice(filterIndex, 1);
        this.setFilters(filterKind, filters);
        this.setFilterLogic(filterKind, recalculateFilterLogic(this.getFilterLogic(filterKind), filterIndex));
        this.setFilterLogicValidity(filterKind, true);
        this.applyLogicValidity(filterKind, '');
    }

    async handleFilterFieldChange(event) {
        const filterKind = event.target.dataset.filterKind;
        const filterIndex = parseInt(event.target.dataset.filterIndex, 10);
        const selectedField = event.detail.value;
        const fieldOption = this.getFieldOptions(filterKind).find((option) => option.value === selectedField);

        if (!fieldOption) {
            this.updateFilter(filterKind, filterIndex, createFilterState(this.getFilters(filterKind)[filterIndex].id));
            return;
        }

        const nextFilter = {
            ...createFilterState(this.getFilters(filterKind)[filterIndex].id),
            conditions: getFieldTypeConditions(fieldOption.inputType),
            field: fieldOption.value,
            isDisabledConditions: false,
            lookupTo: fieldOption.lookupTo || '',
            type: fieldOption.inputType
        };

        if (fieldOption.isBoolean) {
            nextFilter.isPicklist = true;
            nextFilter.options = BOOLEAN_AS_PICKLIST_VALUES;
        } else if (fieldOption.inputType === 'lookup' && fieldOption.lookupTo) {
            nextFilter.isLookup = true;
        } else if (fieldOption.inputType === 'picklist') {
            nextFilter.isPicklist = true;
        }

        this.updateFilter(filterKind, filterIndex, nextFilter);

        if (fieldOption.inputType === 'picklist' && !fieldOption.isBoolean) {
            await this.loadFilterPicklistOptions(filterKind, filterIndex, fieldOption);
        }
    }

    handleFilterConditionChange(event) {
        const filterKind = event.target.dataset.filterKind;
        const filterIndex = parseInt(event.target.dataset.filterIndex, 10);
        const selectedCondition = event.detail.value;
        const currentFilter = this.getFilters(filterKind)[filterIndex];

        this.updateFilter(filterKind, filterIndex, {
            ...currentFilter,
            isDisabledValue: !selectedCondition || !filterNeedsValue(selectedCondition),
            selectedCondition,
            value: filterNeedsValue(selectedCondition) ? currentFilter.value : ''
        });
    }

    handleFilterValueChange(event) {
        const filterKind = event.target.dataset.filterKind;
        const filterIndex = parseInt(event.target.dataset.filterIndex, 10);
        const nextValue = event.detail.recordId || event.detail.value || event.target.value || '';
        const currentFilter = this.getFilters(filterKind)[filterIndex];

        this.updateFilter(filterKind, filterIndex, {
            ...currentFilter,
            value: nextValue
        });
    }

    handleFilterLogicChange(event) {
        const filterKind = event.target.dataset.logicKind;
        this.setFilterLogic(filterKind, event.detail.value || event.target.value || '');
        this.setFilterLogicValidity(filterKind, true);
    }

    handleFilterLogicValidation(event) {
        const filterKind = event.target.dataset.logicKind;
        const validationMessage = this.getFilterLogicValidationMessage(filterKind);
        this.setFilterLogicValidity(filterKind, validationMessage === '');
        event.target.setCustomValidity(validationMessage);
        event.target.reportValidity();
    }

    async handleClearFilters() {
        this.clearFilterSet('base');
        this.clearFilterSet('dataset');
        await this.refreshAnalyticsDataset(false);
    }

    async handleRefreshClick() {
        if (!this.validateAnalyticsConfiguration()) {
            return;
        }

        await this.refreshAnalyticsDataset(true);
    }

    async initializeDashboardData() {
        this.isInitializing = true;

        const [totalsResult, statusResult, objectsResult] = await Promise.allSettled([
            getReviewTotals(),
            getStatusCounts(),
            getAccessibleSObjects()
        ]);

        if (totalsResult.status === 'fulfilled') {
            this.applyTotals(totalsResult.value);
        } else {
            this.notifyError('Unable To Retrieve Summarized Data', totalsResult.reason);
        }

        if (statusResult.status === 'fulfilled') {
            this.statusSummaryData = statusResult.value;
            this.renderStatusChart();
        } else {
            this.notifyError('Unable To Load Status Chart', statusResult.reason);
        }

        if (objectsResult.status === 'fulfilled') {
            this.baseObjectOptions = toOptionList(objectsResult.value);
            this.selectedBaseObjectApiName = this.resolveSelectedOptionValue(
                this.baseObjectOptions,
                this.selectedBaseObjectApiName,
                DEFAULT_BASE_OBJECT_API_NAME
            );
            this.selectedRelationshipPath = this.getSelfRelationshipPathValue();

            try {
                await this.loadAnalyticsContext(this.selectedRelationshipPath);
                await this.refreshAnalyticsDataset(false);
            } catch (error) {
            }
        } else {
            this.analyticsErrorMessage = extractErrorMessage(objectsResult.reason);
            this.notifyError('Unable To Load Analytics Objects', objectsResult.reason);
        }

        this.isInitializing = false;
    }

    async loadAnalyticsContext(preferredRelationshipPath) {
        this.isLoadingContext = true;

        try {
            const context = await getChartAnalyticsContext({
                requestJson: JSON.stringify({
                    baseObjectApiName: this.selectedBaseObjectApiName,
                    selectedRelationshipPath: preferredRelationshipPath || this.selectedRelationshipPath || this.getSelfRelationshipPathValue()
                })
            });

            this.analyticsContext = context;
            this.relationshipPathOptions = toOptionList(context.relationshipPaths);
            this.groupByOptions = this.toFieldOptions(context.groupByFields);
            this.baseFilterFieldOptions = this.toFieldOptions(context.baseFilterableFields);
            this.datasetFilterFieldOptions = this.toFieldOptions(context.filterableFields);
            this.aggregationFieldOptions = this.toFieldOptions(context.aggregationFields);
            this.chartTypeOptions = toOptionList(context.availableChartTypes);
            this.aggregationTypeOptions = toOptionList(context.aggregationTypes);
            this.selectedRelationshipPath = this.resolveSelectedOptionValue(
                this.relationshipPathOptions,
                context.selectedRelationshipPath,
                this.getSelfRelationshipPathValue()
            );
            this.selectedSourceObjectApiName = context.selectedSourceObjectApiName;
            this.selectedGroupByFieldApiName = this.resolveSelectedOptionValue(
                this.groupByOptions,
                this.selectedGroupByFieldApiName,
                context.defaultGroupByFieldApiName
            );
            this.selectedAggregationType = this.resolveSelectedOptionValue(
                this.aggregationTypeOptions,
                this.selectedAggregationType,
                context.defaultAggregationType
            );
            this.selectedChartType = this.resolveSelectedOptionValue(
                this.chartTypeOptions,
                this.selectedChartType,
                context.defaultChartType
            );
            this.selectedAggregationFieldApiName = this.shouldShowAggregationField
                ? this.resolveSelectedOptionValue(
                    this.aggregationFieldOptions,
                    this.selectedAggregationFieldApiName,
                    this.aggregationFieldOptions[0]?.value
                )
                : null;
            this.baseFilters = this.rehydrateFilters(this.baseFilters, this.baseFilterFieldOptions);
            this.datasetFilters = this.rehydrateFilters(this.datasetFilters, this.datasetFilterFieldOptions);
            this.analyticsErrorMessage = '';
        } catch (error) {
            this.analyticsErrorMessage = extractErrorMessage(error);
            this.notifyError('Unable To Load Analytics Context', error);
            throw error;
        } finally {
            this.isLoadingContext = false;
        }
    }

    async refreshAnalyticsDataset(showToastOnError = true) {
        if (!this.selectedBaseObjectApiName || !this.selectedRelationshipPath || !this.selectedGroupByFieldApiName) {
            return;
        }

        this.isRefreshingAnalytics = true;

        try {
            const analyticsResponse = await getChartDataset({
                requestJson: JSON.stringify(this.buildAnalyticsRequest())
            });

            this.analyticsResponse = analyticsResponse;
            this.analyticsErrorMessage = '';
            this.renderAnalyticsChart();
        } catch (error) {
            this.analyticsResponse = null;
            this.analyticsErrorMessage = extractErrorMessage(error);
            this.destroyChart('analyticsChart');

            if (showToastOnError) {
                this.notifyError('Unable To Refresh Analytics', error);
            }
        } finally {
            this.isRefreshingAnalytics = false;
        }
    }

    async loadFilterPicklistOptions(filterKind, filterIndex, fieldOption) {
        try {
            const picklistValues = await getChartFieldPicklistValues({
                fieldName: fieldOption.value,
                sObjectName: this.getFilterObjectApiName(filterKind)
            });

            const currentFilter = this.getFilters(filterKind)[filterIndex];
            if (!currentFilter || currentFilter.field !== fieldOption.value) {
                return;
            }

            this.updateFilter(filterKind, filterIndex, {
                ...currentFilter,
                isPicklist: true,
                options: toOptionList(picklistValues)
            });
        } catch (error) {
            this.notifyError('Unable To Retrieve Picklist Values', error);
        }
    }

    validateAnalyticsConfiguration() {
        if (!this.selectedBaseObjectApiName || !this.selectedRelationshipPath || !this.selectedGroupByFieldApiName) {
            showToast(
                this,
                'Incomplete Analytics Configuration',
                'Select a base object, dataset source, and group-by field before applying analytics.',
                'error'
            );
            return false;
        }

        if (this.shouldShowAggregationField && !this.selectedAggregationFieldApiName) {
            showToast(
                this,
                'Missing Aggregation Field',
                'Select a numeric field for the chosen aggregation type.',
                'error'
            );
            return false;
        }

        return this.validateFilterSection('base') && this.validateFilterSection('dataset');
    }

    validateFilterSection(filterKind) {
        const filters = this.getFilters(filterKind);
        if (!filters.length) {
            this.applyLogicValidity(filterKind, '');
            this.setFilterLogicValidity(filterKind, true);
            return true;
        }

        const incompleteFilter = filters.find((filter) => !this.isFilterComplete(filter));
        if (incompleteFilter) {
            showToast(
                this,
                'Incomplete Filter Configuration',
                `Complete every ${FILTER_SECTIONS[filterKind].label.toLowerCase()} filter before applying analytics.`,
                'error'
            );
            return false;
        }

        const validationMessage = this.getFilterLogicValidationMessage(filterKind);
        this.applyLogicValidity(filterKind, validationMessage);
        this.setFilterLogicValidity(filterKind, validationMessage === '');

        if (validationMessage) {
            showToast(
                this,
                'Invalid Filter Logic',
                validationMessage,
                'error'
            );
            return false;
        }

        return true;
    }

    applyTotals(totals) {
        this.totalReviews = totals?.ReviewProcessTotal || 0;
        this.totalFeedback = totals?.ReviewFeedbackTotal || 0;
        this.totalRecords = totals?.ReviewRecordsTotal || 0;
    }

    buildAnalyticsRequest() {
        return {
            aggregationFieldApiName: this.shouldShowAggregationField ? this.selectedAggregationFieldApiName : null,
            aggregationType: this.selectedAggregationType,
            baseFilterConditions: this.compileFilters(this.baseFilters),
            baseFilterLogic: this.baseFilters.length ? this.baseFilterLogic : '',
            baseObjectApiName: this.selectedBaseObjectApiName,
            chartType: this.selectedChartType,
            filterConditions: this.compileFilters(this.datasetFilters),
            filterLogic: this.datasetFilters.length ? this.datasetFilterLogic : '',
            groupByFieldApiName: this.selectedGroupByFieldApiName,
            resultLimit: clampResultLimit(this.resultLimit),
            selectedRelationshipPath: this.selectedRelationshipPath
        };
    }

    buildAnalyticsChartConfig() {
        const chartResponse = this.analyticsResponse;
        const chartType = chartResponse?.chartType || this.selectedChartType;
        const title = chartResponse
            ? `${chartResponse.relationshipPathLabel} by ${chartResponse.groupByFieldLabel}`
            : ANALYTICS_GRAPH.title;
        const builder = new ChartBuilder(chartType)
            .setLabels(chartResponse.labels)
            .setLegend(GRID_CHART_TYPES.has(chartType) ? 'top' : 'bottom')
            .setTooltip((context) => `${context.dataset.label}: ${context.formattedValue}`)
            .setTitle(title)
            .setResponsive(true)
            .setMaintainAspectRatio(false)
            .setLayoutPadding(0);

        if (chartType === 'doughnut') {
            builder.setCutout('68%');
        }

        chartResponse.datasets.forEach((dataset, datasetIndex) => {
            const palette = this.getChartColors(chartResponse.labels.length, datasetIndex);
            const baseColor = palette[0];
            let backgroundColor = palette;
            let borderColor = palette;

            if (GRID_CHART_TYPES.has(chartType)) {
                backgroundColor = chartType === 'line' ? withAlpha(baseColor) : palette;
                borderColor = chartType === 'line' ? baseColor : palette;
            }

            if (RADIAL_CHART_TYPES.has(chartType)) {
                backgroundColor = withAlpha(baseColor, '2e');
                borderColor = baseColor;
            }

            builder.addDataset({
                backgroundColor,
                borderColor,
                borderWidth: 2,
                data: dataset.values,
                label: dataset.label
            });
        });

        const chartConfig = builder.build();
        if (GRID_CHART_TYPES.has(chartType)) {
            chartConfig.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
        } else if (RADIAL_CHART_TYPES.has(chartType)) {
            chartConfig.options.scales = {
                r: {
                    beginAtZero: true
                }
            };
        }

        return chartConfig;
    }

    buildStatusChartConfig() {
        const labels = Object.keys(this.statusSummaryData || {});
        const data = Object.values(this.statusSummaryData || {});
        const backgroundColor = labels.map((label) => STATUSES_GRAPH_COLOR_MAP[label] || '#94a3b8');

        return new ChartBuilder('doughnut')
            .setLabels(labels)
            .addDataset({
                backgroundColor,
                data,
                label: 'Review Process Status'
            })
            .setCutout('70%')
            .setLegend('bottom')
            .setTooltip((context) => `${context.label}: ${context.raw} review processes`)
            .setTitle(STATUS_GRAPH.title)
            .setResponsive(true)
            .setMaintainAspectRatio(false)
            .setLayoutPadding(0)
            .build();
    }

    clearFilterSet(filterKind) {
        this.setFilters(filterKind, []);
        this.setFilterLogic(filterKind, '');
        this.setFilterLogicValidity(filterKind, true);
        this.applyLogicValidity(filterKind, '');
    }

    compileFilters(filters) {
        return filters.map((filter) => ({
            field: filter.field,
            isLookup: filter.isLookup,
            isPicklist: filter.isPicklist,
            lookupTo: filter.lookupTo,
            selectedCondition: filter.selectedCondition,
            type: filter.type,
            value: filter.value
        }));
    }

    destroyChart(chartPropertyName) {
        if (this[chartPropertyName]) {
            this[chartPropertyName].destroy();
            this[chartPropertyName] = null;
        }
    }

    getChartColors(totalItems, datasetIndex = 0) {
        return Array.from({ length: Math.max(totalItems, 1) }, (_, index) => {
            const colorIndex = (datasetIndex + index) % CHART_PALETTE.length;
            return CHART_PALETTE[colorIndex];
        });
    }

    getFilterLogicValidationMessage(filterKind) {
        const filters = this.getFilters(filterKind);
        if (!filters.length) {
            return '';
        }

        const filterLogic = this.getFilterLogic(filterKind);
        if (!filterLogic?.trim()) {
            return 'Filter logic must be specified.';
        }

        const validationStatus = validateFilterLogic(filterLogic, filters.length);
        if (!validationStatus.isValid) {
            return validationStatus.error;
        }

        const structureErrors = validateFilterLogicStructure(filterLogic);
        return structureErrors[0] || '';
    }

    getFilterObjectApiName(filterKind) {
        return this[FILTER_SECTIONS[filterKind].objectApiNameProperty];
    }

    getFilters(filterKind) {
        return this[FILTER_SECTIONS[filterKind].filtersProperty] || [];
    }

    getFieldOptions(filterKind) {
        return this[FILTER_SECTIONS[filterKind].fieldOptionsProperty] || [];
    }

    getFilterLogic(filterKind) {
        return this[FILTER_SECTIONS[filterKind].logicProperty] || '';
    }

    getSelfRelationshipPathValue() {
        return this.selectedBaseObjectApiName ? `SELF::${this.selectedBaseObjectApiName}` : null;
    }

    isFilterComplete(filter) {
        const hasValue = !filterNeedsValue(filter.selectedCondition) || String(filter.value || '').trim() !== '';
        return Boolean(filter.field && filter.selectedCondition && hasValue);
    }

    notifyError(title, error) {
        showToast(
            this,
            title,
            extractErrorMessage(error),
            'error'
        );
    }

    rehydrateFilters(filters, fieldOptions) {
        return (filters || [])
            .map((filter) => this.rehydrateSingleFilter(filter, fieldOptions))
            .filter((filter) => Boolean(filter));
    }

    rehydrateSingleFilter(filter, fieldOptions) {
        const fieldOption = fieldOptions.find((option) => option.value === filter.field);
        if (!fieldOption) {
            return null;
        }

        const rehydratedFilter = {
            ...createFilterState(filter.id || `rehydrated-${this.filterSequence++}`),
            ...filter,
            conditions: getFieldTypeConditions(fieldOption.inputType),
            field: fieldOption.value,
            isDisabledConditions: false,
            isDisabledValue: !filter.selectedCondition || !filterNeedsValue(filter.selectedCondition),
            lookupTo: fieldOption.lookupTo || '',
            type: fieldOption.inputType
        };

        if (fieldOption.isBoolean) {
            rehydratedFilter.isPicklist = true;
            rehydratedFilter.options = BOOLEAN_AS_PICKLIST_VALUES;
        } else if (fieldOption.inputType === 'lookup' && fieldOption.lookupTo) {
            rehydratedFilter.isLookup = true;
        } else if (fieldOption.inputType === 'picklist') {
            rehydratedFilter.isPicklist = true;
        }

        return rehydratedFilter;
    }

    renderAnalyticsChart() {
        if (!this.isChartJsLoaded) {
            return;
        }

        const canvas = this.template.querySelector(`canvas[data-id="${ANALYTICS_GRAPH.id}"]`);
        if (!canvas) {
            return;
        }

        this.destroyChart('analyticsChart');
        if (!this.analyticsResponse?.labels?.length) {
            return;
        }

        this.analyticsChart = new window.Chart(canvas, this.buildAnalyticsChartConfig());
    }

    renderStatusChart() {
        if (!this.isChartJsLoaded || !this.statusSummaryData) {
            return;
        }

        const canvas = this.template.querySelector(`canvas[data-id="${STATUS_GRAPH.id}"]`);
        if (!canvas) {
            return;
        }

        this.destroyChart('statusChart');
        this.statusChart = new window.Chart(canvas, this.buildStatusChartConfig());
    }

    resolveSelectedOptionValue(options, currentValue, fallbackValue) {
        if (options.some((option) => option.value === currentValue)) {
            return currentValue;
        }

        if (options.some((option) => option.value === fallbackValue)) {
            return fallbackValue;
        }

        return options[0]?.value;
    }

    setFilters(filterKind, filters) {
        this[FILTER_SECTIONS[filterKind].filtersProperty] = filters;
    }

    setFilterLogic(filterKind, value) {
        this[FILTER_SECTIONS[filterKind].logicProperty] = value;
    }

    setFilterLogicValidity(filterKind, value) {
        this[FILTER_SECTIONS[filterKind].logicValidityProperty] = value;
    }

    toFieldOptions(fields = []) {
        return (fields || []).map((field) => ({
            inputType: resolveInputType(field),
            isBoolean: normalizeFieldType(field.type) === 'BOOLEAN',
            label: field.label,
            lookupTo: field.referenceTo,
            value: field.name
        }));
    }

    updateFilter(filterKind, filterIndex, nextFilter) {
        const filters = [...this.getFilters(filterKind)];
        filters[filterIndex] = nextFilter;
        this.setFilters(filterKind, filters);
    }

    applyLogicValidity(filterKind, validationMessage) {
        const logicInput = this.template.querySelector(`[data-logic-kind="${filterKind}"]`);
        if (!logicInput) {
            return;
        }

        logicInput.setCustomValidity(validationMessage);
        logicInput.reportValidity();
    }

    get analyticsSummary() {
        if (!this.analyticsResponse?.labels?.length) {
            return '';
        }

        return `${this.analyticsResponse.sourceObjectLabel} grouped by ${this.analyticsResponse.groupByFieldLabel} using ${this.analyticsResponse.aggregationType}.`;
    }

    get analyticsWarnings() {
        return this.analyticsResponse?.warnings || [];
    }

    get disableApplyButton() {
        return this.isAnalyticsBusy || !this.selectedBaseObjectApiName || !this.selectedRelationshipPath || !this.selectedGroupByFieldApiName;
    }

    get disableBaseFilterRemoval() {
        return this.baseFilters.length <= 1;
    }

    get disableDatasetFilterRemoval() {
        return this.datasetFilters.length <= 1;
    }

    get hasAnalyticsErrorMessage() {
        return Boolean(this.analyticsErrorMessage);
    }

    get hasAnalyticsResponseMessage() {
        return Boolean(this.analyticsResponse?.message);
    }

    get hasAnalyticsSummary() {
        return Boolean(this.analyticsSummary);
    }

    get hasAnalyticsWarnings() {
        return this.analyticsWarnings.length > 0;
    }

    get hasBaseFilters() {
        return this.baseFilters.length > 0;
    }

    get hasDatasetFilters() {
        return this.datasetFilters.length > 0;
    }

    get isAnalyticsBusy() {
        return this.isInitializing || this.isLoadingContext || this.isRefreshingAnalytics;
    }

    get selectedRelationshipDetails() {
        return this.analyticsContext?.relationshipPaths?.find(
            (relationshipPath) => relationshipPath.value === this.selectedRelationshipPath
        );
    }

    get selectedRelationshipTypeLabel() {
        if (!this.selectedRelationshipDetails) {
            return '';
        }

        if (this.selectedRelationshipDetails.usesIdReference) {
            return 'ID-based reference';
        }

        return this.selectedRelationshipDetails.relationshipType === 'SELF'
            ? 'Base object'
            : 'Standard relationship';
    }

    get selectedSourceObjectLabel() {
        return this.analyticsResponse?.sourceObjectLabel
            || this.selectedRelationshipDetails?.sourceObjectLabel
            || '';
    }

    get shouldShowAggregationField() {
        return this.selectedAggregationType !== 'COUNT';
    }
}