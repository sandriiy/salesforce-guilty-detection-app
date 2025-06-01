import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import { showToast, STATUSES_GRAPH_COLOR_MAP } from 'c/utils';
import getStatusCounts from '@salesforce/apex/GuiltyAdminController.getReviewProcessesStatusCounts';
import getReviewTotals from '@salesforce/apex/GuiltyAdminController.getReviewTotals';

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
        this.graphs = this.graphs.map((g, i) => ({
            ...g,
            visible: i === index
        }));
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