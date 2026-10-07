/**
 * Bundled syllable dictionary (smart hiding, Phase 2): common K-5 spelling words,
 * split the way school word lists show them. One entry per line, hyphens between
 * syllables. One-syllable words are left out (they never need splitting).
 * Words that aren't here go to the AI fallback (logged-in users only).
 */
export const SYLLABLE_DATA = `
a-bout a-bove ac-tion ac-tor ad-dress af-ter af-ter-noon a-gain a-go al-low al-most a-lone a-long al-read-y al-so al-ways a-mount an-i-mal an-oth-er an-swer a-ny an-y-one an-y-thing a-part ap-ple a-round ar-rive art-ist a-sleep a-wake a-way
ba-by bad-ly bal-loon bas-ket bath-room beach-es bea-ver beau-ti-ful be-cause be-come be-fore be-gan be-gin be-hind be-ing be-lieve be-low be-side be-tween be-yond bi-cy-cle birth-day blan-ket blos-som bod-y bor-row bot-tle bot-tom bound-a-ry brav-er break-fast broth-er brown-ie bub-ble buck-et bun-ny bus-y but-ter but-ter-fly but-ton buy-ing
cab-in ca-ble cam-el cam-er-a can-dle can-dy cap-tain car-pet car-rot car-ry cas-tle cat-er-pil-lar cel-e-brate cen-ter cen-tu-ry chal-lenge char-ac-ter chick-en chil-dren choc-o-late cir-cle cit-y class-room clev-er clos-et cloud-y col-lect col-or com-mon com-pound com-put-er con-tain con-test cook-ie cop-per cor-ner cot-ton count-er count-ing coun-try coun-ty cous-in cov-er cow-ard cow-boy coy-ote cray-on crowd-ed crown-ing cud-dle cur-few cur-tain
dai-sy dam-age dan-ger dark-ness daugh-ter de-cide de-li-cious den-tist de-stroy dif-fer-ent din-ner di-no-saur di-rect dis-ap-pear dis-cov-er doc-tor dol-lar dol-phin don-key down-hill down-stairs down-town drag-on draw-ing dream-er dress-er dri-ver dur-ing
ea-ger ea-gle ear-ly earth-quake eas-y ef-fort eight-een el-bow el-e-phant e-lev-en emp-ty en-joy en-joy-ing e-nough en-ter e-qual eve-ning ev-er ev-er-y ev-er-y-one ev-er-y-thing ex-cept ex-cit-ed ex-pect ex-plain ex-tra
fa-ble fac-to-ry fam-i-ly fa-mous far-mer fa-ther fa-vor-ite feath-er Feb-ru-ar-y fe-ver fif-teen fi-nal fin-ish fin-ger flow-er flow-er-pot fol-low for-est for-get for-ty for-ward foun-tain frac-tion free-dom Fri-day friend-ly fright-en fro-zen fun-ny fur-ni-ture fu-ture
gal-lon gar-age gar-den gen-tle gi-ant gig-gle gin-ger gi-raffe gold-en good-bye grand-fa-ther grand-moth-er grass-hop-per grav-y group-ing grow-ing grown-up gui-tar
hab-it ham-mer hand-some hap-pen hap-py hard-ly har-vest heav-y hel-lo help-ful hid-den high-way his-to-ry hob-by hol-i-day hol-low home-work hon-est hon-ey hope-ful hos-pi-tal ho-tel hour-ly house-hold how-ev-er howl-ing hun-dred hun-gry hur-ry
ice-berg i-de-a im-por-tant in-sect in-side in-stead in-ter-est in-to in-vent in-vite is-land
jack-et jel-ly jew-el jog-ging joy-ful joy-ous jug-gle jump-ing jun-gle
ket-tle kind-ness kitch-en kit-ten knowl-edge
la-dy lad-der lan-guage laugh-ter lead-er learn-ing lem-on les-son let-ter li-brar-y light-ning li-on lis-ten lit-tle liv-ing lone-ly loud-ly loud-est lov-ing low-er loy-al lunch-box
mag-ic mag-net mail-box mar-ket mat-ter may-be mead-ow mea-sure med-al mel-on mem-ber mid-dle mid-night mil-lion min-ute mir-ror mis-take mitt-en mo-ment Mon-day mon-ey mon-key mon-ster morn-ing moth-er moun-tain mouse-trap mouth-ful mov-ie mud-dy mu-sic
na-ture near-ly neigh-bor nev-er nine-teen no-bod-y noi-sy no-thing no-tice num-ber nurs-er-y
o-cean oc-to-pus of-fice of-ten oint-ment o-pen or-ange or-der oth-er out-doors out-field out-line out-side o-ver o-ver-due own-er oys-ter
pack-age pad-dle pa-per par-ent par-rot par-ty pas-sen-ger peb-ble pen-cil pen-ny peo-ple pep-per per-haps per-son pet-al pho-to pic-nic pic-ture pi-lot pil-low pi-rate piz-za plan-et plas-tic play-ground pleas-ant plen-ty poi-son po-lice pop-corn po-ta-to pow-der pow-er pow-er-ful prac-tice pres-ent pret-ty prob-lem prom-ise prop-er proud-ly pud-dle pump-kin pup-py pur-ple puz-zle
quar-ter quick-ly qui-et
rab-bit rac-coon rain-bow rain-coat read-y re-al-ly re-cess re-mem-ber re-port re-quire res-cue rest-less riv-er road-way rob-in rock-et roy-al rub-ber rul-er
sad-ness safe-ty sail-boat sal-ad sand-wich Sat-ur-day sau-cer sau-sage scis-sors sea-son sec-ond se-cret sev-en sev-er-al shad-ow shout-ing show-er sig-nal sil-ly sil-ver sim-ple sis-ter six-teen sleep-y slow-ly smil-ing snow-man soc-cer so-da sof-a sol-dier some-one some-thing some-times sound-ing south-ern spa-ghet-ti spe-cial spi-der spoil-ing sprout-ing squir-rel stair-way start-ed sto-ry stu-dent sud-den sug-ar sum-mer Sun-day sun-shine sup-per sup-pose sur-prise sweat-er swim-ming
ta-ble tal-ent ta-ble-spoon teach-er tel-e-phone tel-e-vi-sion tem-per-a-ture ten-nis thank-ful thir-teen thir-ty thou-sand thou-sands thun-der Thurs-day tick-et ti-ger to-day to-geth-er toi-let to-mor-row to-night tow-el tow-er trac-tor traf-fic trav-el treas-ure tur-key tur-tle Tues-day twen-ty
um-brel-la un-cle un-der un-der-stand un-til up-on up-set up-stairs us-u-al
va-ca-tion val-ley veg-e-ta-ble ver-y vil-lage vis-it voy-age vow-el
wag-on wait-ing wal-rus wa-ter wa-ter-mel-on weath-er Wednes-day week-end wel-come whis-per wil-low win-dow win-ter wiz-ard won-der won-der-ful wood-en wor-ry writ-er writ-ing
yel-low yes-ter-day yo-gurt young-er
ze-bra ze-ro zip-per
`;
