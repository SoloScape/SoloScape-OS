package org.soloscape.teavm.platform.awt.datatransfer;
public interface Transferable {boolean isDataFlavorSupported(DataFlavor flavor);Object getTransferData(DataFlavor flavor);}
