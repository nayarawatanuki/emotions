import { createGlobalStyle } from 'styled-components';
import legacyWallpaper from './legacy-handprint-wallpaper.png';

import 'react-circular-progressbar/dist/styles.css';
import './buttons/style.css';
import './dialog.css';

export default createGlobalStyle`
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :focus-visible {
        outline: 3px solid #003841;
        outline-offset: 3px;
        scroll-margin-block: 1rem;
    }

    h1, h2, h3 {
        text-wrap: balance;
    }

    p, label, legend {
        text-wrap: pretty;
    }

    input, select, textarea, button {
        font-family: inherit;
    }

    .navbar {
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .navbar-brand {
        max-width: 100%;
        white-space: normal;
        overflow-wrap: break-word;
    }

    .navbar h1 {
        font-size: clamp(1.25rem, 4vw, 1.75rem);
        line-height: 1.25;
        margin: 0;
        max-width: 100%;
        overflow-wrap: break-word;
    }

    .legacy-skip-link {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        z-index: 1100;
        transform: translateY(-200%);
        padding: 0.65rem 1rem;
        background: #fff;
        color: #003841;
    }

    .legacy-skip-link:focus {
        transform: translateY(0);
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        min-height: 100vh;
        line-height: 1.5;
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

    @media (width < 480px) {
        .navbar {
            justify-content: center;
        }

        .navbar h1 {
            text-align: center;
        }
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

    #root {
        min-height: 100vh;
    }
`;