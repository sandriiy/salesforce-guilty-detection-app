import { LightningElement, api } from 'lwc';

import { PROGRESS_GRAPH_COLOR_MAP } from 'c/utils';

export default class GuiltyAccordion extends LightningElement {
    @api name;
    @api total = 0;
    @api positive = 0;
    @api negative = 0;
    @api helpText = '';
    @api helpTextStyles = '';
    
    isAccordionOpen = false;

    toggleSection(event) {
        this.isAccordionOpen = !this.isAccordionOpen;
    }

    get calculateCompletionPercentage() {
        if (this.isNotNumber(this.score) || this.isNotNumber(this.total) || this.total == 0) {
            return 0;
        }

        const safeScore = Math.max(0, Number(this.score));
        const safeTotal = Number(this.total);
        return Math.round((safeScore / safeTotal) * 100);
    }

    get score() {
        return (Number(this.positive) + Number(this.negative));
    }
    
    get dasharray() {
        if (this.isNotNumber(this.score) || this.isNotNumber(this.total)) {
            return '0, 100';
        }

        if (this.score >= this.total) {
            return '100, 100';
        } else if (this.score === 0) {
            return '0, 100';
        } else {
            let feedbackPercent = this.calculateCompletionPercentage;
            return `${feedbackPercent}, 100`;
        }
    }

    get toggleIcon() {
        return this.isAccordionOpen ? 'utility:chevronup' : 'utility:chevrondown';
    }

    get circleStyle() {
        let feedbackPercent = this.calculateCompletionPercentage;
        if (feedbackPercent < 30) {
            return `stroke: ${PROGRESS_GRAPH_COLOR_MAP.Low}`;
        } else if (feedbackPercent > 30 && feedbackPercent < 70) {
            return `stroke: ${PROGRESS_GRAPH_COLOR_MAP.Medium}`;
        } else {
            return `stroke: ${PROGRESS_GRAPH_COLOR_MAP.High}`;
        }
    }

    isNotNumber(value) {
        return typeof value !== 'number' || Number.isNaN(value);
    }
}
