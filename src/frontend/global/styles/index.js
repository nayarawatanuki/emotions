import { createGlobalStyle } from 'styled-components';

import 'react-circular-progressbar/dist/styles.css';

export default createGlobalStyle`
    * {
        margin: 0;
        padding: 0;
        outline: 0;
        box-sizing: border-box;
    }

    body :is(a, button, input, select, textarea, [tabindex]):focus-visible {
        outline: 3px solid #003841;
        outline-offset: 3px;
        scroll-margin-block: 1rem;
    }

    @media (forced-colors: active) {
        body :is(a, button, input, select, textarea, [tabindex]):focus-visible {
            outline-color: Highlight;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .swal-overlay,
        .swal-modal,
        .swal-icon,
        .swal-icon::before,
        .swal-icon::after,
        .swal-icon * {
            animation: none;
            transition: none;
        }
    }

    .form-control {
        border-color: #647d83;
    }

    .form-control:focus {
        border-color: #003841;
    }

    .form-control::placeholder {
        color: #535a60;
        opacity: 1;
    }

    .swal-modal:not(.tcc-reward-modal) .swal-button--confirm {
        background: #11626d;
        color: #fff;
    }

    .swal-modal:not(.tcc-reward-modal) .swal-button--confirm:hover,
    .swal-modal:not(.tcc-reward-modal) .swal-button--confirm:active {
        background: #105b65;
    }

    .swal-modal .swal-button--cancel {
        color: #404040;
    }

    .swal-modal .swal-text {
        color: #595959;
    }

    header {
        width: auto;
        margin: 0;
        padding: 0;
        outline: 0;
        box-sizing: border-box;
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        background: #057B89;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    html, header, body, #root {
        height: auto 100%
    }
`;