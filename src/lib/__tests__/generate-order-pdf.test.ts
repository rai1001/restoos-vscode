import { describe, expect, it, vi } from "vitest"

import { generateOrderPDF } from "@/lib/utils/generate-order-pdf"

describe("generateOrderPDF", () => {
  it("escapes untrusted HTML before writing printable markup", () => {
    const write = vi.fn()
    const close = vi.fn()
    const focus = vi.fn()
    const print = vi.fn()

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: { write, close },
      focus,
      print,
    } as unknown as Window)

    generateOrderPDF({
      orderNumber: "PO-<script>alert(1)</script>",
      date: "2026-04-18",
      expectedDelivery: "<img src=x onerror=alert(2)>",
      notes: "<svg onload=alert(3)></svg>",
      restaurant: {
        name: "Rest <b>One</b>",
        address: "Addr & <tag>",
        phone: "123",
      },
      supplier: {
        name: "Supplier <i>X</i>",
        contactName: "<script>bad()</script>",
        email: "x@example.com",
        phone: "555",
      },
      lines: [
        {
          productName: '<img src=x onerror="alert(4)">',
          quantity: 1,
          unit: '<script>alert("u")</script>',
          unitPrice: 10,
        },
      ],
    })

    expect(openSpy).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledOnce()

    const html = write.mock.calls[0]?.[0] as string
    expect(html).toContain("PO-&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).toContain("&lt;img src=x onerror=alert(2)&gt;")
    expect(html).toContain("&lt;svg onload=alert(3)&gt;&lt;/svg&gt;")
    expect(html).toContain("Rest &lt;b&gt;One&lt;/b&gt;")
    expect(html).toContain("Addr &amp; &lt;tag&gt;")
    expect(html).toContain("Supplier &lt;i&gt;X&lt;/i&gt;")
    expect(html).toContain("&lt;script&gt;bad()&lt;/script&gt;")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(4)&quot;&gt;")
    expect(html).toContain("&lt;script&gt;alert(&quot;u&quot;)&lt;/script&gt;")

    expect(html).not.toContain('<img src=x onerror="alert(4)">')
    expect(html).not.toContain("<script>alert(1)</script>")

    openSpy.mockRestore()
  })
})
