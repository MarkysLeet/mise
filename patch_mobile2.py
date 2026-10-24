with open("app/(main)/puantaj/components/MobilePuantajView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "selectedOutletFilter,\n  setSelectedOutletFilter,\n}: MobilePuantajViewProps",
    "selectedOutletFilter,\n  setSelectedOutletFilter,\n  handleUndoTerminate\n}: MobilePuantajViewProps"
)

with open("app/(main)/puantaj/components/MobilePuantajView.tsx", "w") as f:
    f.write(content)
print("Patched MobilePuantajView.tsx")
