export default class ChartBuilder {
    constructor(type = 'bar') {
        this.chartConfig = {
            type,
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {},
                layout: {}
            }
        };
    }

    setType(type) {
        this.chartConfig.type = type;
        return this;
    }

    setLabels(labels = []) {
        this.chartConfig.data.labels = labels;
        return this;
    }

    addDataset({ label, data, backgroundColor, borderColor, borderWidth = 1 }) {
        this.chartConfig.data.datasets.push({
            label,
            data,
            backgroundColor,
            borderColor,
            borderWidth
        });
        return this;
    }

    setCutout(value) {
        this.chartConfig.options.cutout = value;
        return this;
    }

    setLegend(position = 'bottom') {
        this.chartConfig.options.plugins.legend = { position };
        return this;
    }

    setTooltip(callback) {
        this.chartConfig.options.plugins.tooltip = {
            callbacks: { label: callback }
        };
        return this;
    }

    setTitle(title) {
        this.chartConfig.options.plugins.title = {
            display: true,
            text: title
        };
        return this;
    }

    setResponsive(responsive = true) {
        this.chartConfig.options.responsive = responsive;
        return this;
    }

    setMaintainAspectRatio(value = true) {
        this.chartConfig.options.maintainAspectRatio = value;
        return this;
    }

    setLayoutPadding(padding = 0) {
        this.chartConfig.options.layout.padding = padding;
        return this;
    }

    setOptions(options) {
        this.chartConfig.options = {
            ...this.chartConfig.options,
            ...options
        };
        return this;
    }

    build() {
        return this.chartConfig;
    }
}
