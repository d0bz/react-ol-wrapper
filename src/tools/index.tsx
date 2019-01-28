import { Merge } from './merge';
import { Splice } from './splice';
import { BorderEdit } from './border_edit';
import { ModifyArea } from './modify_area';
import { Tools } from './tools';

let tool = {
    Merge: Merge,
    Splice: Splice,
    BorderEdit: BorderEdit,
    ModifyArea: ModifyArea
};

export {
    tool,
    Tools
};
