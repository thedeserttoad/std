let isPartsSelected;

function isTrue() {
    isPartsSelected = true;
}

function isFalse() {
    isPartsSelected = false;
}

function SheetSelection() {
    return isPartsSelected;
}

module.exports = {
    isTrue,
    isFalse,
    SheetSelection
};