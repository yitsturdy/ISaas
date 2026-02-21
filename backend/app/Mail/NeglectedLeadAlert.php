<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class NeglectedLeadAlert extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $owner,
        public readonly Collection $leads,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '【ISaas】放置リードアラート：対応が必要なリードがあります',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.neglected_lead_alert',
        );
    }
}
