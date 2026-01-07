// for now we'll just manually translate all of the css to js
// You must therefore edit any colors here AND in the themes.css file.
// TODO: find a better way to have the js theme and the css work together
// Path: src/core/themes.js
var themes = {

    //.theme-dark
    dark: {
            DarkColor1: "#333333",
            DarkColor2: "#222222",
            DarkColor3: "#111111",
            MidColor1: "#777777",
            MidColor2: "#9b9b9b",
            MidColor3: "#aaaaaa",
            LightColor1: "#cccccc",
            LightColor2: "#ededed",
            LightColor3: "#fafafa",
            msColor1: "#ff9922",
            msColor2: "#ff8000",
            msColor3: "#df6000",
            efgColor1: "#2299ff",
            efgColor2: "#0080ff",
            efgColor3: "#0060df",
            dipColor1: "#00ff80",
            dipColor2: "#00df60",
            dipColor3: "#00bb50",
            jcColor1: "#ff2299",
            jcColor2: "#ff0080",
            jcColor3: "#df0060",
            spinsysColor1: "#9467bd",
            spinsysColor2: "#7b5ea6",
            spinsysColor3: "#63458f",
            OkColor1: "#22ff33",
            OkColor2: "#00cc22",
            OkColor3: "#00aa10",
            ErrColor1: "#ff3322",
            ErrColor2: "#cc2200",
            ErrColor3: "#aa1000",
            OverlayColor: "#111111aa"
    },
    //.theme-light
    light: {
            DarkColor1: "#333333",
            DarkColor2: "#222222",
            DarkColor3: "#111111",
            MidColor1: "#777777",
            MidColor2: "#666666",
            MidColor3: "#555555",
            LightColor1: "#bbbbcc",
            LightColor2: "#dadae5",
            LightColor3: "#ffffff",
            msColor3: "#ff9922",
            msColor2: "#ff8000",
            msColor1: "#df6000",
            efgColor3: "#2299ff",
            efgColor2: "#0080ff",
            efgColor1: "#0060df",
            dipColor3: "#00ff80",
            dipColor2: "#00df60",
            dipColor1: "#00bb50",
            jcColor3: "#ff2299",
            jcColor2: "#ff0080",
            jcColor1: "#df0060",
            spinsysColor1: "#63458f",
            spinsysColor2: "#7b5ea6",
            spinsysColor3: "#9467bd",
            OkColor1: "#00aa10",
            OkColor2: "#00cc22",
            OkColor3: "#22ff33",
            ErrColor1: "#aa1000",
            ErrColor2: "#cc2200",
            ErrColor3: "#ff3322",
            OverlayColor: "#111111aa"
    }
}

// compute the background and forground colors from the theme
themes.dark.BkgColor1 = themes.dark.DarkColor1;
themes.dark.BkgColor2 = themes.dark.DarkColor2;
themes.dark.BkgColor3 = themes.dark.DarkColor3;
themes.dark.FwdColor1 = themes.dark.LightColor1;
themes.dark.FwdColor2 = themes.dark.LightColor2;
themes.dark.FwdColor3 = themes.dark.LightColor3;
themes.dark.sel_sitesColor1 = themes.dark.FwdColor1;
themes.dark.sel_sitesColor2 = themes.dark.FwdColor2;
themes.dark.sel_sitesColor3 = themes.dark.FwdColor3;

themes.light.BkgColor1 = themes.light.LightColor1;
themes.light.BkgColor2 = themes.light.LightColor2;
themes.light.BkgColor3 = themes.light.LightColor3;
themes.light.FwdColor1 = themes.light.DarkColor1;
themes.light.FwdColor2 = themes.light.DarkColor2;
themes.light.FwdColor3 = themes.light.DarkColor3;
themes.light.sel_sitesColor1 = themes.light.FwdColor1;
themes.light.sel_sitesColor2 = themes.light.FwdColor2;
themes.light.sel_sitesColor3 = themes.light.FwdColor3;


// more aliases
themes.dark.background = themes.dark.BkgColor3;
themes.dark.foreground = themes.dark.FwdColor3;
themes.light.background = themes.light.BkgColor3;
themes.light.foreground = themes.light.FwdColor3;

// export
export { themes };