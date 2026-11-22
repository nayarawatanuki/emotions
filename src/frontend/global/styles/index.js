import { createGlobalStyle } from 'styled-components';

import 'react-circular-progressbar/dist/styles.css';

export default createGlobalStyle`
    * {
        margin: 0;
        padding: 0;
        outline: 0;
        box-sizing: border-box;
    }

    :focus-visible {
        outline: 3px solid #003841;
        outline-offset: 3px;
    }

    @media (forced-colors: active) {
        :focus-visible {
            outline-color: Highlight;
        }
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
        background: rgb(31, 178, 197);
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    html, header, body, #root {
        height: auto 100%
    }
`;