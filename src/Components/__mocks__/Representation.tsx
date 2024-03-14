// SPDX-License-Identifier: BSD-2-Clause
// Copyright  (c) 2020-2023, The Chancellor, Masters and Scholars of the University
// of Oxford, and the 'Galv' Developers. All rights reserved.

import dummy from "./DummyComponent";
import {RepresentationProps} from "../Representation";
import {BaseResource} from "../ResourceCard";
import {LookupKey} from "../../constants";

export function representation(params: {data: BaseResource, lookup_key: LookupKey}): string {
    return `representation: ${params.lookup_key} [${params.data.uuid ?? params.data.id}]`
}

export default function Representation(params: RepresentationProps) {
    return dummy('Representation', params)
}
