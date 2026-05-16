import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import { showToast, STATUSES_GRAPH_COLOR_MAP } from 'c/utils';
import getStatusCounts from '@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts';
import getReviewTotals from '@salesforce/apex/GuiltyAdminController.getReviewTotals';
import getDynamicChartDataset from '@salesforce/apex/GuiltyAdminController.getDynamicChartDataset';

import chartjs from '@salesforce/resourceUrl/ChartJsLibrary';
import ChartBuilder from 'c/chartUtils';

const STANDARD_GRAPH = { 
    id: 'status-graph', 
    title: 'Review Processes By Status', 
    visible: true
};

export default class AdminReviewProcessDashboard extends LightningElement {
    totalReviews;
    totalFeedback;
    totalRecords;

    chartRequest = {
        baseObjectApiName: 'Account',
        sourceObjectApiName: 'ReviewProcess__c',
        groupByFieldApiName: 'Status__c',
        chartType: 'bar'
    };

    baseObjectOptions = [
        { label: 'Account', value: 'Account' },
        { label: 'Contact', value: 'Contact' },
        { label: 'Opportunity', value: 'Opportunity' }
    ];

    objectOptions = [
        { label: 'Review Process', value: 'ReviewProcess__c' },
        { label: 'Review Feedback', value: 'ReviewFeedback__c' }
    ];

    get fieldOptions() {
        if (this.chartRequest.sourceObjectApiName === 'ReviewProcess__c') {
            return [
                { label: 'Status', value: 'Status__c' }
            ];
        } else if (this.chartRequest.sourceObjectApiName === 'ReviewFeedback__c') {
            return [
                { label: 'Assessment', value: 'Assessment__c' },
                { label: 'Record Id (Polymorphic)', value: 'RecordId__c' },
                { label: 'Is Reviewed', value: 'isReviewed__c' }
            ];
        }
        return [];
    }

    chartTypeOptions = [
        { label: 'Bar', value: 'bar' },
        { label: 'Doughnut', value: 'doughnut' },
        { label: 'Line', value: 'line' },
        { label: 'Pie', value: 'pie' }
    ];

    @track customGraphs = [];
    @track isChartJsLoaded = false;
    async renderedCallback() {
        if (!this.isChartJsLoaded) {
            loadScript(this, chartjs)
                .then(libraryLoadedResult => {
                    console.log('Chart.JS successfully loaded', window.Chart);
                    return getStatusCounts();
                })
                .then(summaryData => {
                    this.resolveStandardGraphs(summaryData);
                })
                .catch(error => {
                    console.log(error);
                    showToast(
                        this,
                        'Unable To Load/Create Default Chart',
                        'For more information, contact your System Administrator',
                        'error'
                    );
                });

            this.isChartJsLoaded = true;
        }
    }

    @wire(getReviewTotals)
    wiredReviewTotals({ data, error }) {
        if (data) {
            this.totalReviews = data['ReviewProcessTotal'];
            this.totalFeedback = data['ReviewFeedbackTotal'];
            this.totalRecords = data['ReviewRecordsTotal'];
        } else if (error) {
            console.log(error);
            showToast(
                this,
                'Unable To Retrieve Summarized Data',
                'For more information, contact your System Administrator',
                'error'
            );
}
    }

    handleDotChange(event) {
        const index = parseInt(event.target.value, 10);
        let all = this.allGraphs;
        all.forEach((g, i) => {
            g.visible = (i === index);
        });
        
        let tempStd = all.find(g => g.id === STANDARD_GRAPH.id);
        STANDARD_GRAPH.visible = tempStd ? tempStd.visible : false;
        
        this.customGraphs = all.filter(g => g.id !== STANDARD_GRAPH.id).map((g) => ({...g}));
    }

    handleChartParamsChange(event) {
        const { name, value } = event.target;
        this.chartRequest = { ...this.chartRequest, [name]: value };
        
        // Reset valid groupBy field if object changes
        if (name === 'sourceObjectApiName') {
            if (value === 'ReviewProcess__c') {
                this.chartRequest.groupByFieldApiName = 'Status__c';
            } else if (value === 'ReviewFeedback__c') {
                this.chartRequest.groupByFieldApiName = 'Assessment__c';
            }
        }
    }

    handleAddCustomChart() {
        getDynamicChartDataset({ request: this.chartRequest })
            .then(result => {
                if (result.errorMessage) {
                    showToast(this, 'Chart Error', result.errorMessage, 'error');
                    return;
                }
                const newId = 'custom-graph-' + Date.now();
                const newGraph = {
                    id: newId,
                    title: `Custom ${result.chartType} on ${result.sourceObjectApiName}`,
                    visible: true
                };
                
                STANDARD_GRAPH.visible = false;
                const updatedCustom = this.customGraphs.map(g => {
                    g.visible = false;
                    return g;
                });
                updatedCustom.push(newGraph);
                this.customGraphs = updatedCustom;

                // Let the DOM update so canvas is present when we navigate
                setTimeout(() => {
                    const canvas = this.template.querySelector(`canvas[data-id="${newId}"]`);
                    if (canvas) {
                        const config = new ChartBuilder(result.chartType)
                            .setLabels(result.labels)
                            .addDataset({
                                label: 'Counts',
                                data: result.datasets,
                                backgroundColor: result.labels.map((_, i) => Object.values(STATUSES_GRAPH_COLOR_MAP)[i % 4] || '#cccccc')
                            })
                            .setTitle(newGraph.title)
                            .build();
                        new window.Chart(canvas, config);
                    }
                }, 100);
            })
            .catch(error => {
                showToast(this, 'Error Creating Chart', error.body.message, 'error');
            });
    }

    resolveStandardGraphs(data) {
        let defaultChartConfig = this.getDefaultChartConfig(data);
        let defaultGraphCanvas = this.template.querySelector(`canvas[data-id="${STANDARD_GRAPH.id}"]`);
        new window.Chart(defaultGraphCanvas, defaultChartConfig);
    }

    getDefaultChartConfig(statusData) {
        let labels = Object.keys(statusData);
        let data = Object.values(statusData);
        let backgroundColor = labels.map(status => STATUSES_GRAPH_COLOR_MAP[status] || '#cccccc');

        return new ChartBuilder('doughnut')
            .setLabels(labels)
            .addDataset({
                label: 'Record Progress',
                data,
                backgroundColor
            })
            .setCutout('70%')
            .setLegend('bottom')
            .setTooltip(ctx => `${ctx.label}: ${ctx.raw} records`)
            .setTitle(STANDARD_GRAPH.title)
            .setResponsive(true)
            .setMaintainAspectRatio(false)
            .setLayoutPadding(0)
            .build();
    }

    get allGraphs() {
        return [STANDARD_GRAPH, ...this.customGraphs];
    }

    get activeIndex() {
        return this.graphs.findIndex(graph => graph.visible);
    }
}