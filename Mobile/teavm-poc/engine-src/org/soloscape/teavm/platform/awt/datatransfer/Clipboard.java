package org.soloscape.teavm.platform.awt.datatransfer;
/** Local clipboard ownership. System clipboard access requires asynchronous host permission. */
public final class Clipboard {
    private Transferable contents;private ClipboardOwner owner;
    public Transferable getContents(Object requestor){return contents;}
    public void setContents(Transferable next,ClipboardOwner nextOwner){
        Transferable previous=contents;ClipboardOwner previousOwner=owner;contents=next;owner=nextOwner;
        if(previousOwner!=null&&previousOwner!=nextOwner)previousOwner.lostOwnership(this,previous);
    }
}
