package org.soloscape.teavm.platform.awt.datatransfer;
public final class StringSelection implements Transferable {
    private final String text;public StringSelection(String text){this.text=text;}
    public boolean isDataFlavorSupported(DataFlavor flavor){return flavor==DataFlavor.stringFlavor;}
    public Object getTransferData(DataFlavor flavor){if(!isDataFlavorSupported(flavor))throw new IllegalArgumentException("Unsupported clipboard flavor");return text;}
}
