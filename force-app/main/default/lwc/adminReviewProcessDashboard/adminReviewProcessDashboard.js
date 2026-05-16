import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import { showToast, STATUSES_GRAPH_COLOR_MAP } from 'c/utils';
import getStatusCounts from '@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts';
import getReviewTotals from '@salesforce/apex/GuiltyAdminController.getReviewTotals';
import getAccessibleSObjects from '@salesforce/apex/GuiltyAdminController.getAccessibleSObjects';

import chartjs from '@salesforce/resourceUrl/ChartJsLibrary';
import ChartBuilder from 'c/chartUtils';

const STANDARD_GRAPH = { 
    id: 'status-graph', 
    title: 'Review Processes By Status'
};

export default class AdminReviewProcessDashboard extends LightningElement {
    totalReviews;
    totalFeedback;
    totalRecords;

    @track customGraphs = [];
    @track activeGraphIndex = 0;
    @track isChartJsLoaded = false;
    @track analyticsBaseObjectApiName;
    @track accessibleSObjectOptions = [];

    async renderedCallback() {
        if (!this.isChartJsLoaded) {
            loadScript(this, chartjs)
                .then(libraryLoadedResult => {
                    return getStatusCounts();
                })
                .then(summaryData => {
                    this.resolveStandardGraphs(summaryData);
                })
                .catch(error => {
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
            showToast(
                this,
                'Unable To Retrieve Summarized Data',
                'For more information, contact your System Administrator',
                'error'
            );
        }
    }

    @wire(getAccessibleSObjects)
    wiredAccessibleSObjects({ data, error }) {
        if (data) {
            this.accessibleSObjectOptions = data;
        } else if (error) {
            showToast(
                this,
                'Unable To Load Objects',
                'For more information, contact your System Administrator',
                'error'
            );
        }
    }

    handleDotChange(event) {
        this.activeGraphIndex = parseInt(event.target.value, 10);
    }

    handleBaseObjectChange(event) {
        this.analyticsBaseObjectApiName = event.detail.value;
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
        return [STANDARD_GRAPH, ...this.customGraphs].map((g, i) => ({
            ...g,
            visible: i === this.activeGraphIndex
        }));
    }
}