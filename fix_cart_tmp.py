import re
with open("src/main.tsx") as f:
    c = f.read()

old = '''<div className="cart-item" key={x.name}><div><h3>{x.name}</h3><p>{money(x.price)} c/u</p></div><div className="qty"><button onClick={()=>change(x.name,-1)}><Minus size={15}/></button><b>{x.qty}</b><button onClick={()=>change(x.name,1)}><Plus size={15}/></button></div><div className="cart-item-actions"><strong>{money(x.price*x.qty)}</strong><button className="remove-item" aria-label={`Eliminar ${x.name}`} onClick={()=>removeItem(x.name)}><Trash2 size={16}/></button></div></div>'''

new = '''<div className="cart-item" key={x.name}><div className="cart-item-info"><h3>{x.name}</h3><p>{money(x.price)} c/u</p><div className="qty"><button onClick={()=>change(x.name,-1)}><Minus size={15}/></button><b>{x.qty}</b><button onClick={()=>change(x.name,1)}><Plus size={15}/></button></div></div><div className="cart-item-actions"><strong>{money(x.price*x.qty)}</strong><button className="remove-item" aria-label={`Eliminar ${x.name}`} onClick={()=>removeItem(x.name)}><Trash2 size={16}/></button></div></div>'''

if old in c:
    c2 = c.replace(old, new)
    with open("src/main.tsx","w") as f:
        f.write(c2)
    print("ok")
else:
    print("nf")
