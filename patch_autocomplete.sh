#!/bin/bash
# EmployeeAutocomplete modal closes on click because the mousedown on the portal is considered "outside" the wrapperRef!
# To fix this, we should change how onmousedown works or stop propagation on mousedown in the dropdown.
