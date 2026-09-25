# Color contrast measurements

Calculated from exact sRGB values. Normal text: 4.5:1; relevant UI boundaries: 3:1. Large text can use 3:1, but these label pairs target 4.5:1. Subtle decorative borders are not sufficient input boundaries. Logo text has an exemption; accessible pairings are still preferred. These checks do not establish whole-product accessibility.

|Theme|Use|Foreground|Background|Ratio|Target|Result|
|---|---|---|---|---:|---:|---|
|light|Body text|#142B2B|#F5F7F2|13.806:1|4.5:1|PASS|
|light|Body text on card|#142B2B|#FFFFFF|14.892:1|4.5:1|PASS|
|light|Secondary text|#526762|#FFFFFF|6.043:1|4.5:1|PASS|
|light|Secondary text on raised card|#526762|#FFFFFF|6.043:1|4.5:1|PASS|
|light|Button label|#FFFFFF|#087F72|4.896:1|4.5:1|PASS|
|light|Button hover label|#FFFFFF|#06675D|6.761:1|4.5:1|PASS|
|light|Focus ring|#087F72|#F5F7F2|4.539:1|3:1|PASS|
|light|Focus ring on card|#087F72|#FFFFFF|4.896:1|3:1|PASS|
|light|Input boundary|#70867E|#FFFFFF|3.889:1|3:1|PASS|
|light|Input boundary on canvas|#70867E|#F5F7F2|3.605:1|3:1|PASS|
|light|Success label|#1E6F42|#E5F4E9|5.414:1|4.5:1|PASS|
|light|Warning label|#805000|#FFF1D6|6.135:1|4.5:1|PASS|
|light|Error label|#B42336|#FDE9ED|5.582:1|4.5:1|PASS|
|light|Info label|#245AA8|#E8F0FC|5.898:1|4.5:1|PASS|
|dark|Body text|#F5F7F2|#102322|15.145:1|4.5:1|PASS|
|dark|Body text on card|#F5F7F2|#193431|12.346:1|4.5:1|PASS|
|dark|Secondary text|#B7CDC3|#193431|7.949:1|4.5:1|PASS|
|dark|Secondary text on raised card|#B7CDC3|#23413C|6.622:1|4.5:1|PASS|
|dark|Button label|#102322|#A5E6D5|11.574:1|4.5:1|PASS|
|dark|Button hover label|#102322|#BCEEE1|12.8:1|4.5:1|PASS|
|dark|Focus ring|#D6F36A|#102322|13.137:1|3:1|PASS|
|dark|Focus ring on card|#D6F36A|#193431|10.709:1|3:1|PASS|
|dark|Input boundary|#7A998C|#193431|4.289:1|3:1|PASS|
|dark|Input boundary on canvas|#7A998C|#102322|5.261:1|3:1|PASS|
|dark|Success label|#8DDDAB|#193D2C|7.485:1|4.5:1|PASS|
|dark|Warning label|#FFD089|#44351C|8.26:1|4.5:1|PASS|
|dark|Error label|#FFADB8|#48282F|7.359:1|4.5:1|PASS|
|dark|Info label|#ADCDFF|#233853|7.351:1|4.5:1|PASS|
|brand|Forbidden: white text on citron|#FFFFFF|#D6F36A|1.244:1|4.5:1|FAIL|
|brand|Forbidden: mint text on white|#A5E6D5|#FFFFFF|1.411:1|4.5:1|FAIL|
|brand|Ink text on citron|#142B2B|#D6F36A|11.975:1|4.5:1|PASS|
|brand|Ink text on mint|#142B2B|#A5E6D5|10.551:1|4.5:1|PASS|

Sources: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
