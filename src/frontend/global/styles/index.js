import { createGlobalStyle } from 'styled-components';
import legacyWallpaper from './legacy-handprint-wallpaper.png';

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

    header {
        width: auto;
        margin: 0;
        padding: 0;
        outline: 0;
        box-sizing: border-box;
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        min-height: 100vh;
        background-color: #65aeb5;
        background-image:
            linear-gradient(rgba(101, 174, 181, 0.72), rgba(101, 174, 181, 0.72)),
            url("${legacyWallpaper}");
        background-repeat: no-repeat;
        background-position: center, center bottom;
        background-size: cover, 100% min(56.25vw, calc(100% - 4.5rem));
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    @media (max-width: 480px), (forced-colors: active) {
        body {
            background-image: none;
        }
    }

    @media (forced-colors: active) {
        :focus-visible {
            outline-color: Highlight;
        }
    }

    html, header, body, #root {
        height: auto 100%
    }
`;